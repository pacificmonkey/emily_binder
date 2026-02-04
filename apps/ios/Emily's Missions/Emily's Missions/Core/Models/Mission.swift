//
//  Mission.swift
//  Emily's Missions
//
//  Mission, MissionStep, and MissionCompletion models
//

import Foundation

// MARK: - MissionStep

struct MissionStep: Codable, Identifiable, Equatable {
    let id: String
    var text: String
    var completed: Bool

    init(id: String = UUID().uuidString, text: String, completed: Bool = false) {
        self.id = id
        self.text = text
        self.completed = completed
    }
}

// MARK: - Mission

struct Mission: Codable, Identifiable {
    let id: String
    let ownerUserId: String
    let createdByUserId: String
    var title: String
    var instructionsMd: String?
    var steps: [MissionStep]
    var categoryId: String
    var missionType: MissionType
    var oneTimeAssignment: OneTimeAssignment?
    var dueDate: String?
    var weekStartDate: String?
    var deadline: String?
    var recurrencePattern: RecurrencePattern?
    var weekdays: [Int]?
    var snoozedUntil: String?
    var sortOrder: Int
    var isSnoozable: Bool
    var archived: Bool
    let createdAt: String
    var updatedAt: String

    // Joined data
    var category: Category?

    enum CodingKeys: String, CodingKey {
        case id
        case ownerUserId = "owner_user_id"
        case createdByUserId = "created_by_user_id"
        case title
        case instructionsMd = "instructions_md"
        case steps
        case categoryId = "category_id"
        case missionType = "mission_type"
        case oneTimeAssignment = "one_time_assignment"
        case dueDate = "due_date"
        case weekStartDate = "week_start_date"
        case deadline
        case recurrencePattern = "recurrence_pattern"
        case weekdays
        case snoozedUntil = "snoozed_until"
        case sortOrder = "sort_order"
        case isSnoozable = "is_snoozable"
        case archived
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case category
    }
}

// MARK: - MissionCompletion

struct MissionCompletion: Codable, Identifiable {
    let id: String
    let missionId: String
    let completionDate: String
    let completedByUserId: String
    let vpAwarded: Int
    let completedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case missionId = "mission_id"
        case completionDate = "completion_date"
        case completedByUserId = "completed_by_user_id"
        case vpAwarded = "vp_awarded"
        case completedAt = "completed_at"
    }
}

// MARK: - TodayMission (View Model)

/// Combines Mission with its completion state for display
struct TodayMission: Identifiable {
    let mission: Mission
    var isCompleted: Bool
    var completion: MissionCompletion?

    var id: String { mission.id }
    var title: String { mission.title }
    var category: Category? { mission.category }
    var steps: [MissionStep] { mission.steps }
    var isSnoozable: Bool { mission.isSnoozable }
    var snoozedUntil: String? { mission.snoozedUntil }

    var completedStepsCount: Int {
        steps.filter { $0.completed }.count
    }

    var hasSteps: Bool {
        !steps.isEmpty
    }

    var stepsProgress: String {
        "\(completedStepsCount)/\(steps.count)"
    }

    var vpValue: Int {
        category?.vpValue ?? 0
    }
}

// MARK: - CreateMissionInput

struct CreateMissionInput: Encodable {
    let ownerUserId: String
    let createdByUserId: String
    let title: String
    let instructionsMd: String?
    let steps: [MissionStep]
    let categoryId: String
    let missionType: MissionType
    let oneTimeAssignment: OneTimeAssignment?
    let dueDate: String?
    let weekStartDate: String?
    let recurrencePattern: RecurrencePattern?
    let weekdays: [Int]?
    let isSnoozable: Bool

    enum CodingKeys: String, CodingKey {
        case ownerUserId = "owner_user_id"
        case createdByUserId = "created_by_user_id"
        case title
        case instructionsMd = "instructions_md"
        case steps
        case categoryId = "category_id"
        case missionType = "mission_type"
        case oneTimeAssignment = "one_time_assignment"
        case dueDate = "due_date"
        case weekStartDate = "week_start_date"
        case recurrencePattern = "recurrence_pattern"
        case weekdays
        case isSnoozable = "is_snoozable"
    }
}
