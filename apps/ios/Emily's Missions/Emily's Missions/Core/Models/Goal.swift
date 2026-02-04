//
//  Goal.swift
//  Emily's Missions
//
//  Goal and GoalItem models
//

import Foundation

// MARK: - Goal

struct Goal: Codable, Identifiable {
    let id: String
    let ownerUserId: String
    let createdByUserId: String
    var title: String
    var descriptionMd: String?
    var goalType: GoalType
    var isCompleted: Bool
    var completedAt: String?
    var archived: Bool
    let createdAt: String
    var updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case ownerUserId = "owner_user_id"
        case createdByUserId = "created_by_user_id"
        case title
        case descriptionMd = "description_md"
        case goalType = "goal_type"
        case isCompleted = "is_completed"
        case completedAt = "completed_at"
        case archived
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

// MARK: - GoalItem

struct GoalItem: Codable, Identifiable {
    let id: String
    let goalId: String
    let missionId: String?
    let attachmentUrl: String?
    let attachmentName: String?
    var sortOrder: Int
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case goalId = "goal_id"
        case missionId = "mission_id"
        case attachmentUrl = "attachment_url"
        case attachmentName = "attachment_name"
        case sortOrder = "sort_order"
        case createdAt = "created_at"
    }
}

// MARK: - GoalWithItems (View Model)

struct GoalWithItems: Identifiable {
    let goal: Goal
    var items: [GoalItem]
    var linkedMissions: [Mission]

    var id: String { goal.id }
    var title: String { goal.title }
    var description: String? { goal.descriptionMd }
    var goalType: GoalType { goal.goalType }
    var isCompleted: Bool { goal.isCompleted }

    var progress: GoalProgress {
        let total = linkedMissions.count
        // For progress calculation, we'd need completion data
        // This is a simplified version
        return GoalProgress(totalMissions: total, completedMissions: 0)
    }
}

// MARK: - GoalProgress

struct GoalProgress {
    let totalMissions: Int
    let completedMissions: Int

    var percentComplete: Double {
        guard totalMissions > 0 else { return 0 }
        return Double(completedMissions) / Double(totalMissions)
    }

    var progressText: String {
        "\(completedMissions)/\(totalMissions)"
    }

    var isComplete: Bool {
        totalMissions > 0 && completedMissions >= totalMissions
    }
}

// MARK: - CreateGoalInput

struct CreateGoalInput: Encodable {
    let ownerUserId: String
    let createdByUserId: String
    let title: String
    let descriptionMd: String?
    let goalType: GoalType

    enum CodingKeys: String, CodingKey {
        case ownerUserId = "owner_user_id"
        case createdByUserId = "created_by_user_id"
        case title
        case descriptionMd = "description_md"
        case goalType = "goal_type"
    }
}
