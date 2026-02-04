//
//  Types.swift
//  Emily's Missions
//
//  Shared type definitions and enums
//

import Foundation

// MARK: - User & Permissions

enum Role: String, Codable, CaseIterable {
    case emily
    case support
    case joey
}

// MARK: - Mission Types

enum MissionType: String, Codable {
    case oneTime = "one_time"
    case recurring
}

enum RecurrencePattern: String, Codable {
    case daily
    case weekly
    case specificWeekdays = "specific_weekdays"
}

enum OneTimeAssignment: String, Codable {
    case dayAssigned = "day_assigned"
    case weekAssigned = "week_assigned"
}

enum EndOfDayPolicy: String, Codable {
    case carryoverNextDay = "carryover_next_day"
    case neverCarryover = "never_carryover"
    case convertToThisWeek = "convert_to_this_week"
}

// MARK: - Event Types

enum EventCategory: String, Codable, CaseIterable {
    case general
    case medication
    case appointment
    case refill

    var icon: String {
        switch self {
        case .general: return "calendar"
        case .medication: return "pills.fill"
        case .appointment: return "stethoscope"
        case .refill: return "arrow.triangle.2.circlepath"
        }
    }
}

// MARK: - Goal Types

enum GoalType: String, Codable {
    case destiny
    case quest
}

// MARK: - Mood Types

enum MoodQuadrant: String, Codable, CaseIterable {
    case highEnergyPleasant = "high_energy_pleasant"
    case highEnergyUnpleasant = "high_energy_unpleasant"
    case lowEnergyPleasant = "low_energy_pleasant"
    case lowEnergyUnpleasant = "low_energy_unpleasant"

    var displayName: String {
        switch self {
        case .highEnergyPleasant: return "High Energy / Pleasant"
        case .highEnergyUnpleasant: return "High Energy / Unpleasant"
        case .lowEnergyPleasant: return "Low Energy / Pleasant"
        case .lowEnergyUnpleasant: return "Low Energy / Unpleasant"
        }
    }

    var emoji: String {
        switch self {
        case .highEnergyPleasant: return "😄"
        case .highEnergyUnpleasant: return "😤"
        case .lowEnergyPleasant: return "😌"
        case .lowEnergyUnpleasant: return "😔"
        }
    }
}

// MARK: - Health Types

enum ProviderType: String, Codable, CaseIterable {
    case doctor
    case therapist
    case group
    case other

    var displayName: String {
        switch self {
        case .doctor: return "Doctor"
        case .therapist: return "Therapist"
        case .group: return "Group"
        case .other: return "Other"
        }
    }

    var icon: String {
        switch self {
        case .doctor: return "stethoscope"
        case .therapist: return "brain.head.profile"
        case .group: return "person.3.fill"
        case .other: return "person.fill"
        }
    }
}

enum HealthAccessLevel: String, Codable {
    case none
    case view
    case edit
}

// MARK: - Budget Types

enum ExpenseFrequency: String, Codable {
    case monthly
    case oneTime = "one_time"
}

// MARK: - Supply Risk Level

enum SupplyRiskLevel: String {
    case ok
    case warning
    case critical

    var color: String {
        switch self {
        case .ok: return "green"
        case .warning: return "yellow"
        case .critical: return "red"
        }
    }
}
