//
//  Category.swift
//  Emily's Missions
//
//  Category model for mission categorization
//

import Foundation

struct Category: Codable, Identifiable {
    let id: String
    var name: String
    var color: String?
    var icon: String?
    var vpValue: Int
    var endOfDayPolicy: EndOfDayPolicy
    var isMandatoryDefault: Bool
    var sortOrder: Int
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case color
        case icon
        case vpValue = "vp_value"
        case endOfDayPolicy = "end_of_day_policy"
        case isMandatoryDefault = "is_mandatory_default"
        case sortOrder = "sort_order"
        case createdAt = "created_at"
    }
}

extension Category {
    /// Default category for when none is specified
    static let defaultCategory = Category(
        id: "default",
        name: "General",
        color: "#6B7280",
        icon: "checkmark.circle",
        vpValue: 5,
        endOfDayPolicy: .carryoverNextDay,
        isMandatoryDefault: false,
        sortOrder: 0,
        createdAt: ISO8601DateFormatter().string(from: Date())
    )
}
