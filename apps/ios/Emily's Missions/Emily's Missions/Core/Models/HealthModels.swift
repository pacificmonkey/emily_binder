//
//  HealthModels.swift
//  Emily's Missions
//
//  Health-related models: Medication, Provider, Pharmacy, Intake
//

import Foundation

// MARK: - HealthPharmacy

struct HealthPharmacy: Codable, Identifiable {
    let id: String
    let ownerUserId: String
    var name: String
    var phone: String?
    var address: String?
    var notesMd: String?
    var active: Bool
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case ownerUserId = "owner_user_id"
        case name
        case phone
        case address
        case notesMd = "notes_md"
        case active
        case createdAt = "created_at"
    }
}

// MARK: - HealthProvider

struct HealthProvider: Codable, Identifiable {
    let id: String
    let ownerUserId: String
    var providerType: ProviderType
    var name: String
    var specialtyOrRole: String?
    var phone: String?
    var email: String?
    var address: String?
    var portalUrl: String?
    var notesMd: String?
    var active: Bool
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case ownerUserId = "owner_user_id"
        case providerType = "provider_type"
        case name
        case specialtyOrRole = "specialty_or_role"
        case phone
        case email
        case address
        case portalUrl = "portal_url"
        case notesMd = "notes_md"
        case active
        case createdAt = "created_at"
    }
}

// MARK: - HealthMedication

struct HealthMedication: Codable, Identifiable {
    let id: String
    let ownerUserId: String
    var name: String
    var instructionsMd: String?
    var pillsOnHand: Int?
    var pillsPerDay: Double?
    var lowSupplyThreshold: Int?
    var rxNumbers: [String]?
    var refillsRemaining: Int?
    var refillInstructions: String?
    var renewalInstructions: String?
    var lastRefillDate: String?
    var nextRefillDueDate: String?
    var pharmacyId: String?
    var prescriberProviderId: String?
    var notesMd: String?
    var active: Bool
    let createdAt: String
    var updatedAt: String

    // Joined data
    var pharmacy: HealthPharmacy?
    var prescriber: HealthProvider?

    enum CodingKeys: String, CodingKey {
        case id
        case ownerUserId = "owner_user_id"
        case name
        case instructionsMd = "instructions_md"
        case pillsOnHand = "pills_on_hand"
        case pillsPerDay = "pills_per_day"
        case lowSupplyThreshold = "low_supply_threshold"
        case rxNumbers = "rx_numbers"
        case refillsRemaining = "refills_remaining"
        case refillInstructions = "refill_instructions"
        case renewalInstructions = "renewal_instructions"
        case lastRefillDate = "last_refill_date"
        case nextRefillDueDate = "next_refill_due_date"
        case pharmacyId = "pharmacy_id"
        case prescriberProviderId = "prescriber_provider_id"
        case notesMd = "notes_md"
        case active
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case pharmacy
        case prescriber
    }
}

// MARK: - HealthMedIntakeLog

struct HealthMedIntakeLog: Codable, Identifiable {
    let id: String
    let ownerUserId: String
    let medicationId: String
    let takenAt: String
    let doseText: String?
    let note: String?
    let createdByUserId: String
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case ownerUserId = "owner_user_id"
        case medicationId = "medication_id"
        case takenAt = "taken_at"
        case doseText = "dose_text"
        case note
        case createdByUserId = "created_by_user_id"
        case createdAt = "created_at"
    }
}

// MARK: - HealthRefillLog

struct HealthRefillLog: Codable, Identifiable {
    let id: String
    let ownerUserId: String
    let medicationId: String
    let refillDate: String
    let pillsAdded: Int?
    let refillsRemainingAfter: Int?
    let rxNumberUsed: String?
    let note: String?
    let createdByUserId: String
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case ownerUserId = "owner_user_id"
        case medicationId = "medication_id"
        case refillDate = "refill_date"
        case pillsAdded = "pills_added"
        case refillsRemainingAfter = "refills_remaining_after"
        case rxNumberUsed = "rx_number_used"
        case note
        case createdByUserId = "created_by_user_id"
        case createdAt = "created_at"
    }
}

// MARK: - HealthAccessConfig

struct HealthAccessConfig: Codable, Identifiable {
    let id: String
    let ownerUserId: String
    var supportAccess: HealthAccessLevel
    var emilyCanLogIntake: Bool
    var emilyCanViewIntakeHistory: Bool
    let createdAt: String
    var updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case ownerUserId = "owner_user_id"
        case supportAccess = "support_access"
        case emilyCanLogIntake = "emily_can_log_intake"
        case emilyCanViewIntakeHistory = "emily_can_view_intake_history"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

// MARK: - MedicationSupplyStatus (View Model)

struct MedicationSupplyStatus {
    let medication: HealthMedication
    let daysRemaining: Int?
    let riskLevel: SupplyRiskLevel
    let runOutDate: Date?
    let refillByDate: Date?

    init(medication: HealthMedication) {
        self.medication = medication

        // Calculate days remaining
        if let pillsOnHand = medication.pillsOnHand,
           let pillsPerDay = medication.pillsPerDay,
           pillsPerDay > 0 {
            self.daysRemaining = Int(Double(pillsOnHand) / pillsPerDay)

            // Calculate dates
            let calendar = Calendar.current
            if let days = self.daysRemaining {
                self.runOutDate = calendar.date(byAdding: .day, value: days, to: Date())
                // Refill by date is a few days before run out
                self.refillByDate = calendar.date(byAdding: .day, value: max(0, days - 3), to: Date())
            } else {
                self.runOutDate = nil
                self.refillByDate = nil
            }

            // Determine risk level
            let threshold = medication.lowSupplyThreshold ?? 7
            if let days = self.daysRemaining {
                if days <= 3 {
                    self.riskLevel = .critical
                } else if days <= threshold {
                    self.riskLevel = .warning
                } else {
                    self.riskLevel = .ok
                }
            } else {
                self.riskLevel = .ok
            }
        } else {
            self.daysRemaining = nil
            self.riskLevel = .ok
            self.runOutDate = nil
            self.refillByDate = nil
        }
    }

    var statusText: String {
        if let days = daysRemaining {
            return "\(days) days remaining"
        }
        return "Supply not tracked"
    }
}

// MARK: - RefillRisk

struct RefillRisk {
    let medication: HealthMedication
    let riskLevel: SupplyRiskLevel
    let message: String
    let daysRemaining: Int?
}

// MARK: - Create Inputs

struct CreateMedicationInput: Encodable {
    let ownerUserId: String
    let name: String
    let instructionsMd: String?
    let pillsOnHand: Int?
    let pillsPerDay: Double?
    let lowSupplyThreshold: Int?
    let refillInstructions: String?
    let renewalInstructions: String?
    let pharmacyId: String?
    let prescriberProviderId: String?

    enum CodingKeys: String, CodingKey {
        case ownerUserId = "owner_user_id"
        case name
        case instructionsMd = "instructions_md"
        case pillsOnHand = "pills_on_hand"
        case pillsPerDay = "pills_per_day"
        case lowSupplyThreshold = "low_supply_threshold"
        case refillInstructions = "refill_instructions"
        case renewalInstructions = "renewal_instructions"
        case pharmacyId = "pharmacy_id"
        case prescriberProviderId = "prescriber_provider_id"
    }
}

struct CreateProviderInput: Encodable {
    let ownerUserId: String
    let providerType: ProviderType
    let name: String
    let specialtyOrRole: String?
    let phone: String?
    let email: String?
    let portalUrl: String?

    enum CodingKeys: String, CodingKey {
        case ownerUserId = "owner_user_id"
        case providerType = "provider_type"
        case name
        case specialtyOrRole = "specialty_or_role"
        case phone
        case email
        case portalUrl = "portal_url"
    }
}

struct LogIntakeInput: Encodable {
    let ownerUserId: String
    let medicationId: String
    let takenAt: String
    let doseText: String?
    let note: String?
    let createdByUserId: String

    enum CodingKeys: String, CodingKey {
        case ownerUserId = "owner_user_id"
        case medicationId = "medication_id"
        case takenAt = "taken_at"
        case doseText = "dose_text"
        case note
        case createdByUserId = "created_by_user_id"
    }
}
