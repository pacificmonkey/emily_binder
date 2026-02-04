//
//  Streak.swift
//  Emily's Missions
//
//  Streak state and grace token models
//

import Foundation

// MARK: - WeeklyStreakState

struct WeeklyStreakState: Codable, Identifiable {
    let id: String
    let userId: String
    let missionId: String
    var currentStreak: Int
    var longestStreak: Int
    var lastCompletedWeek: String?
    let updatedAt: String

    // Joined data
    var mission: Mission?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case missionId = "mission_id"
        case currentStreak = "current_streak"
        case longestStreak = "longest_streak"
        case lastCompletedWeek = "last_completed_week"
        case updatedAt = "updated_at"
        case mission
    }
}

// MARK: - GraceToken

struct GraceToken: Codable, Identifiable {
    let id: String
    let userId: String
    var quantity: Int
    let updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case quantity
        case updatedAt = "updated_at"
    }
}

// MARK: - StreakDisplay (View Model)

struct StreakDisplay: Identifiable {
    let streak: WeeklyStreakState
    let missionTitle: String

    var id: String { streak.id }

    var currentStreak: Int { streak.currentStreak }
    var longestStreak: Int { streak.longestStreak }

    var streakText: String {
        if currentStreak == 1 {
            return "1 week"
        }
        return "\(currentStreak) weeks"
    }

    var isAtRisk: Bool {
        // Streak is at risk if it hasn't been completed this week
        // This would need week calculation logic
        false
    }

    var icon: String {
        if currentStreak >= 52 {
            return "flame.fill"  // Year streak!
        } else if currentStreak >= 12 {
            return "star.fill"   // Quarter streak
        } else if currentStreak >= 4 {
            return "bolt.fill"   // Month streak
        }
        return "checkmark.circle.fill"
    }
}

// MARK: - GraceTokenPurchase

struct GraceTokenPurchaseOption {
    let quantity: Int
    let cost: Int
    let savings: Int?

    var displayText: String {
        if quantity == 1 {
            return "1 Token"
        }
        return "\(quantity) Tokens"
    }

    var costText: String {
        "\(cost) coins"
    }

    var savingsText: String? {
        guard let savings = savings, savings > 0 else { return nil }
        return "Save \(savings) coins"
    }
}

// MARK: - StreakProtection

struct StreakProtection {
    let streakId: String
    let weekKey: String
    let tokensUsed: Int
    let protectedAt: Date
}
