//
//  Sticker.swift
//  Emily's Missions
//
//  Sticker catalog, ownership, and placement models
//

import Foundation

// MARK: - StickerCatalog

struct StickerCatalog: Codable, Identifiable {
    let id: String
    var name: String
    var imageUrl: String
    var costCoins: Int
    var category: String?
    var sortOrder: Int
    var active: Bool
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case imageUrl = "image_url"
        case costCoins = "cost_coins"
        case category
        case sortOrder = "sort_order"
        case active
        case createdAt = "created_at"
    }
}

// MARK: - StickerOwnership

struct StickerOwnership: Codable, Identifiable {
    let id: String
    let userId: String
    let stickerId: String
    let purchasedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case stickerId = "sticker_id"
        case purchasedAt = "purchased_at"
    }
}

// MARK: - StickerPlacement

struct StickerPlacement: Codable, Identifiable {
    let id: String
    let userId: String
    let stickerId: String
    var positionX: Double
    var positionY: Double
    var scale: Double
    var rotation: Double
    var zIndex: Int
    let createdAt: String
    var updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case stickerId = "sticker_id"
        case positionX = "position_x"
        case positionY = "position_y"
        case scale
        case rotation
        case zIndex = "z_index"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

// MARK: - OwnedSticker (View Model)

struct OwnedSticker: Identifiable {
    let sticker: StickerCatalog
    let ownership: StickerOwnership
    var placement: StickerPlacement?

    var id: String { sticker.id }
    var name: String { sticker.name }
    var imageUrl: String { sticker.imageUrl }

    var isPlaced: Bool {
        placement != nil
    }
}

// MARK: - ShopSticker (View Model)

struct ShopSticker: Identifiable {
    let sticker: StickerCatalog
    let isOwned: Bool

    var id: String { sticker.id }
    var name: String { sticker.name }
    var imageUrl: String { sticker.imageUrl }
    var cost: Int { sticker.costCoins }
    var category: String? { sticker.category }

    var canPurchase: Bool {
        !isOwned
    }
}

// MARK: - Create/Update Inputs

struct CreateStickerPlacementInput: Encodable {
    let userId: String
    let stickerId: String
    let positionX: Double
    let positionY: Double
    let scale: Double
    let rotation: Double
    let zIndex: Int

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case stickerId = "sticker_id"
        case positionX = "position_x"
        case positionY = "position_y"
        case scale
        case rotation
        case zIndex = "z_index"
    }
}

struct UpdateStickerPlacementInput: Encodable {
    let positionX: Double
    let positionY: Double
    let scale: Double
    let rotation: Double

    enum CodingKeys: String, CodingKey {
        case positionX = "position_x"
        case positionY = "position_y"
        case scale
        case rotation
    }
}
