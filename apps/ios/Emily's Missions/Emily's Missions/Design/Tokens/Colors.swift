//
//  Colors.swift
//  Emily's Missions
//
//  Color palette matching web app CSS variables
//

import SwiftUI

/// App color palette - matches web CSS variables
enum AppColors {
    // MARK: - Primary Colors

    /// Primary brand color (blue)
    static let primary = Color(hex: "#3B82F6")!

    /// Primary hover state
    static let primaryHover = Color(hex: "#2563EB")!

    /// Primary subtle background
    static let primarySubtle = Color(hex: "#EFF6FF")!

    // MARK: - Accent Colors

    /// Accent color (indigo/purple)
    static let accent = Color(hex: "#6366F1")!

    /// Accent hover state
    static let accentHover = Color(hex: "#4F46E5")!

    /// Accent subtle background
    static let accentSubtle = Color(hex: "#EEF2FF")!

    // MARK: - Semantic Colors

    /// Success (green)
    static let success = Color(hex: "#22C55E")!
    static let successSubtle = Color(hex: "#DCFCE7")!

    /// Warning (yellow/orange)
    static let warning = Color(hex: "#F59E0B")!
    static let warningSubtle = Color(hex: "#FEF3C7")!

    /// Error (red)
    static let error = Color(hex: "#EF4444")!
    static let errorSubtle = Color(hex: "#FEE2E2")!

    /// Info (blue)
    static let info = Color(hex: "#3B82F6")!
    static let infoSubtle = Color(hex: "#DBEAFE")!

    // MARK: - Neutral Colors

    /// Text primary
    static let textPrimary = Color(hex: "#111827")!

    /// Text secondary
    static let textSecondary = Color(hex: "#6B7280")!

    /// Text muted
    static let textMuted = Color(hex: "#9CA3AF")!

    /// Border color
    static let border = Color(hex: "#E5E7EB")!

    /// Divider color
    static let divider = Color(hex: "#F3F4F6")!

    // MARK: - Background Colors

    /// Background primary
    static let backgroundPrimary = Color(hex: "#FFFFFF")!

    /// Background secondary
    static let backgroundSecondary = Color(hex: "#F9FAFB")!

    /// Background tertiary
    static let backgroundTertiary = Color(hex: "#F3F4F6")!

    // MARK: - Gamification Colors

    /// VP (Victory Points) color
    static let vp = Color(hex: "#8B5CF6")!
    static let vpSubtle = Color(hex: "#F5F3FF")!

    /// Coins color
    static let coins = Color(hex: "#F59E0B")!
    static let coinsSubtle = Color(hex: "#FFFBEB")!

    /// Level color
    static let level = Color(hex: "#10B981")!
    static let levelSubtle = Color(hex: "#ECFDF5")!

    /// Streak color
    static let streak = Color(hex: "#F97316")!
    static let streakSubtle = Color(hex: "#FFF7ED")!

    // MARK: - Category Colors (Common)

    static let categoryColors: [String: Color] = [
        "red": Color(hex: "#EF4444")!,
        "orange": Color(hex: "#F97316")!,
        "yellow": Color(hex: "#EAB308")!,
        "green": Color(hex: "#22C55E")!,
        "blue": Color(hex: "#3B82F6")!,
        "indigo": Color(hex: "#6366F1")!,
        "purple": Color(hex: "#A855F7")!,
        "pink": Color(hex: "#EC4899")!,
        "gray": Color(hex: "#6B7280")!,
    ]

    /// Get category color by name or hex
    static func categoryColor(_ colorString: String?) -> Color {
        guard let colorString = colorString else { return .gray }

        // Check if it's a named color
        if let namedColor = categoryColors[colorString.lowercased()] {
            return namedColor
        }

        // Try parsing as hex
        return Color(hex: colorString) ?? .gray
    }

    // MARK: - Mood Quadrant Colors

    static func moodColor(for quadrant: MoodQuadrant) -> Color {
        switch quadrant {
        case .highEnergyPleasant:
            return Color(hex: "#22C55E")! // Green
        case .highEnergyUnpleasant:
            return Color(hex: "#EF4444")! // Red
        case .lowEnergyPleasant:
            return Color(hex: "#3B82F6")! // Blue
        case .lowEnergyUnpleasant:
            return Color(hex: "#6B7280")! // Gray
        }
    }

    // MARK: - Event Category Colors

    static func eventColor(for category: EventCategory) -> Color {
        switch category {
        case .general:
            return primary
        case .medication:
            return Color(hex: "#8B5CF6")! // Purple
        case .appointment:
            return Color(hex: "#EC4899")! // Pink
        case .refill:
            return Color(hex: "#F97316")! // Orange
        }
    }

    // MARK: - Supply Risk Colors

    static func supplyRiskColor(for level: SupplyRiskLevel) -> Color {
        switch level {
        case .ok:
            return success
        case .warning:
            return warning
        case .critical:
            return error
        }
    }
}

// MARK: - Color Extension for App Colors

extension Color {
    /// App primary color
    static var appPrimary: Color { AppColors.primary }

    /// App accent color
    static var appAccent: Color { AppColors.accent }

    /// App success color
    static var appSuccess: Color { AppColors.success }

    /// App warning color
    static var appWarning: Color { AppColors.warning }

    /// App error color
    static var appError: Color { AppColors.error }
}
