//
//  Event.swift
//  Emily's Missions
//
//  Event and EventCompletion models
//

import Foundation

// MARK: - Event

struct Event: Codable, Identifiable {
    let id: String
    let ownerUserId: String
    let createdByUserId: String
    var title: String
    var descriptionMd: String?
    var location: String?
    var eventDate: String
    var eventTime: String?
    var endTime: String?
    var allDay: Bool
    var isMandatory: Bool
    var category: EventCategory
    var categoryId: String?
    var isRecurring: Bool
    var recurrencePattern: RecurrencePattern?
    var weekdayFlags: Int?
    var recurrenceEndDate: String?
    var healthMedicationId: String?
    var healthProviderId: String?
    var archived: Bool
    let createdAt: String
    var updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case ownerUserId = "owner_user_id"
        case createdByUserId = "created_by_user_id"
        case title
        case descriptionMd = "description_md"
        case location
        case eventDate = "event_date"
        case eventTime = "event_time"
        case endTime = "end_time"
        case allDay = "all_day"
        case isMandatory = "is_mandatory"
        case category
        case categoryId = "category_id"
        case isRecurring = "is_recurring"
        case recurrencePattern = "recurrence_pattern"
        case weekdayFlags = "weekday_flags"
        case recurrenceEndDate = "recurrence_end_date"
        case healthMedicationId = "health_medication_id"
        case healthProviderId = "health_provider_id"
        case archived
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

// MARK: - EventCompletion

struct EventCompletion: Codable, Identifiable {
    let id: String
    let eventId: String
    let completedByUserId: String
    let vpAwarded: Int
    let completedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case eventId = "event_id"
        case completedByUserId = "completed_by_user_id"
        case vpAwarded = "vp_awarded"
        case completedAt = "completed_at"
    }
}

// MARK: - TodayEvent (View Model)

/// Combines Event with its completion state for display
struct TodayEvent: Identifiable {
    let event: Event
    var isCompleted: Bool
    var completion: EventCompletion?

    var id: String { event.id }
    var title: String { event.title }
    var eventTime: String? { event.eventTime }
    var location: String? { event.location }
    var category: EventCategory { event.category }
    var isMandatory: Bool { event.isMandatory }
    var isRecurring: Bool { event.isRecurring }

    var vpValue: Int {
        // Mandatory events get multiplier (configured in economy)
        isMandatory ? 8 : 5
    }

    var formattedTime: String? {
        guard let time = eventTime else { return nil }
        // Time comes as HH:mm:ss, convert to 12-hour format
        let inputFormatter = DateFormatter()
        inputFormatter.dateFormat = "HH:mm:ss"
        guard let date = inputFormatter.date(from: time) else { return time }

        let outputFormatter = DateFormatter()
        outputFormatter.dateFormat = "h:mm a"
        return outputFormatter.string(from: date)
    }
}

// MARK: - CreateEventInput

struct CreateEventInput: Encodable {
    let ownerUserId: String
    let createdByUserId: String
    let title: String
    let descriptionMd: String?
    let location: String?
    let eventDate: String
    let eventTime: String?
    let endTime: String?
    let allDay: Bool
    let isMandatory: Bool
    let category: EventCategory
    let isRecurring: Bool
    let recurrencePattern: RecurrencePattern?
    let weekdayFlags: Int?
    let recurrenceEndDate: String?
    let healthMedicationId: String?
    let healthProviderId: String?

    enum CodingKeys: String, CodingKey {
        case ownerUserId = "owner_user_id"
        case createdByUserId = "created_by_user_id"
        case title
        case descriptionMd = "description_md"
        case location
        case eventDate = "event_date"
        case eventTime = "event_time"
        case endTime = "end_time"
        case allDay = "all_day"
        case isMandatory = "is_mandatory"
        case category
        case isRecurring = "is_recurring"
        case recurrencePattern = "recurrence_pattern"
        case weekdayFlags = "weekday_flags"
        case recurrenceEndDate = "recurrence_end_date"
        case healthMedicationId = "health_medication_id"
        case healthProviderId = "health_provider_id"
    }
}
