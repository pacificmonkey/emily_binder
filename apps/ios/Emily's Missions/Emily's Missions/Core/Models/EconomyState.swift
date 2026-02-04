//
//  EconomyState.swift
//  Emily's Missions
//
//  Economy, level, and badge models
//

import Foundation

// MARK: - EconomyState

struct EconomyState: Codable, Identifiable {
    let id: String
    let userId: String
    var totalVp: Int
    var currentLevel: Int
    var coins: Int
    let updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case totalVp = "total_vp"
        case currentLevel = "current_level"
        case coins
        case updatedAt = "updated_at"
    }
}

// MARK: - EconomyConfig

struct EconomyConfig: Codable, Identifiable {
    let id: String
    let levelThresholds: [Int]
    let coinsPerLevel: [Int]
    let dailyWinThreshold: Int
    let mandatoryEventMultiplier: Double
    let graceTokenCost: Int
    let weeklyStreakPromptDay: Int
    let weeklyStreakPromptHour: Int
    let createdAt: String
    let updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case levelThresholds = "level_thresholds"
        case coinsPerLevel = "coins_per_level"
        case dailyWinThreshold = "daily_win_threshold"
        case mandatoryEventMultiplier = "mandatory_event_multiplier"
        case graceTokenCost = "grace_token_cost"
        case weeklyStreakPromptDay = "weekly_streak_prompt_day"
        case weeklyStreakPromptHour = "weekly_streak_prompt_hour"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

// MARK: - Badge

struct Badge: Codable, Identifiable {
    let id: String
    let userId: String
    let badgeType: String
    let badgeName: String
    let badgeDescription: String?
    let badgeIcon: String?
    let relatedMissionId: String?
    let milestoneValue: Int?
    let earnedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case badgeType = "badge_type"
        case badgeName = "badge_name"
        case badgeDescription = "badge_description"
        case badgeIcon = "badge_icon"
        case relatedMissionId = "related_mission_id"
        case milestoneValue = "milestone_value"
        case earnedAt = "earned_at"
    }
}

// MARK: - DailyWinStatus (View Model)

struct DailyWinStatus {
    let vpEarnedToday: Int
    let threshold: Int
    let isWon: Bool

    var progress: Double {
        guard threshold > 0 else { return 0 }
        return min(Double(vpEarnedToday) / Double(threshold), 1.0)
    }

    var progressText: String {
        "\(vpEarnedToday)/\(threshold) VP"
    }
}

// MARK: - LevelProgress (View Model)

struct LevelProgress {
    let currentLevel: Int
    let totalVp: Int
    let vpForCurrentLevel: Int
    let vpForNextLevel: Int

    var vpIntoLevel: Int {
        totalVp - vpForCurrentLevel
    }

    var vpNeeded: Int {
        vpForNextLevel - vpForCurrentLevel
    }

    var progress: Double {
        guard vpNeeded > 0 else { return 1.0 }
        return Double(vpIntoLevel) / Double(vpNeeded)
    }

    var progressText: String {
        "\(vpIntoLevel)/\(vpNeeded) VP to Level \(currentLevel + 1)"
    }
}

// MARK: - Profile

struct Profile: Codable, Identifiable {
    let id: String
    var displayName: String
    var roleGlobal: Role
    var active: Bool
    let createdAt: String
    var updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case displayName = "display_name"
        case roleGlobal = "role_global"
        case active
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

// MARK: - MoodFeeling

struct MoodFeeling: Codable, Identifiable {
    let id: String
    let name: String
    let quadrant: MoodQuadrant
    let sortOrder: Int
    let active: Bool

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case quadrant
        case sortOrder = "sort_order"
        case active
    }
}

// MARK: - MoodLog

struct MoodLog: Codable, Identifiable {
    let id: String
    let userId: String
    let quadrant: MoodQuadrant
    let feelings: [String]
    let intensity: Int?
    let note: String?
    let loggedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case quadrant
        case feelings
        case intensity
        case note
        case loggedAt = "logged_at"
    }
}

// MARK: - MoodCheckinStatus

struct MoodCheckinStatus {
    let canCheckin: Bool
    let checkinsToday: Int
    let maxCheckins: Int
    let cooldownMinutes: Int?
}
