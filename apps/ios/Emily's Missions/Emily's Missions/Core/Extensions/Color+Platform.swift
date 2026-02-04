//
//  Color+Platform.swift
//  Emily's Missions
//
//  Cross-platform color helpers for iOS and macOS
//

import SwiftUI
#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

extension Color {
    // MARK: - System Colors (Cross-Platform)

    /// Primary background color
    static var systemBackground: Color {
        #if canImport(UIKit)
        Color(UIColor.systemBackground)
        #elseif canImport(AppKit)
        Color(NSColor.windowBackgroundColor)
        #else
        Color.white
        #endif
    }

    /// Secondary background color
    static var secondarySystemBackground: Color {
        #if canImport(UIKit)
        Color(UIColor.secondarySystemBackground)
        #elseif canImport(AppKit)
        Color(NSColor.controlBackgroundColor)
        #else
        Color(white: 0.95)
        #endif
    }

    /// Grouped background color (for grouped table views)
    static var systemGroupedBackground: Color {
        #if canImport(UIKit)
        Color(UIColor.systemGroupedBackground)
        #elseif canImport(AppKit)
        Color(NSColor.windowBackgroundColor)
        #else
        Color(white: 0.95)
        #endif
    }

    /// Secondary grouped background
    static var secondarySystemGroupedBackground: Color {
        #if canImport(UIKit)
        Color(UIColor.secondarySystemGroupedBackground)
        #elseif canImport(AppKit)
        Color(NSColor.controlBackgroundColor)
        #else
        Color.white
        #endif
    }

    /// Tertiary background
    static var tertiarySystemBackground: Color {
        #if canImport(UIKit)
        Color(UIColor.tertiarySystemBackground)
        #elseif canImport(AppKit)
        Color(NSColor.textBackgroundColor)
        #else
        Color.white
        #endif
    }

    // MARK: - Text Colors

    /// Primary label color
    static var label: Color {
        #if canImport(UIKit)
        Color(UIColor.label)
        #elseif canImport(AppKit)
        Color(NSColor.labelColor)
        #else
        Color.primary
        #endif
    }

    /// Secondary label color
    static var secondaryLabel: Color {
        #if canImport(UIKit)
        Color(UIColor.secondaryLabel)
        #elseif canImport(AppKit)
        Color(NSColor.secondaryLabelColor)
        #else
        Color.secondary
        #endif
    }

    /// Tertiary label color
    static var tertiaryLabel: Color {
        #if canImport(UIKit)
        Color(UIColor.tertiaryLabel)
        #elseif canImport(AppKit)
        Color(NSColor.tertiaryLabelColor)
        #else
        Color.secondary.opacity(0.7)
        #endif
    }

    /// Placeholder text color
    static var placeholderText: Color {
        #if canImport(UIKit)
        Color(UIColor.placeholderText)
        #elseif canImport(AppKit)
        Color(NSColor.placeholderTextColor)
        #else
        Color.gray
        #endif
    }

    // MARK: - Separator Colors

    /// Separator color
    static var separator: Color {
        #if canImport(UIKit)
        Color(UIColor.separator)
        #elseif canImport(AppKit)
        Color(NSColor.separatorColor)
        #else
        Color.gray.opacity(0.3)
        #endif
    }

    /// Opaque separator color
    static var opaqueSeparator: Color {
        #if canImport(UIKit)
        Color(UIColor.opaqueSeparator)
        #elseif canImport(AppKit)
        Color(NSColor.separatorColor)
        #else
        Color.gray.opacity(0.5)
        #endif
    }

    // MARK: - Fill Colors

    /// System fill color
    static var systemFill: Color {
        #if canImport(UIKit)
        Color(UIColor.systemFill)
        #elseif canImport(AppKit)
        Color(NSColor.controlColor)
        #else
        Color.gray.opacity(0.2)
        #endif
    }

    /// Secondary fill color
    static var secondarySystemFill: Color {
        #if canImport(UIKit)
        Color(UIColor.secondarySystemFill)
        #elseif canImport(AppKit)
        Color(NSColor.controlColor).opacity(0.8)
        #else
        Color.gray.opacity(0.15)
        #endif
    }

    // MARK: - App-Specific Colors

    /// Success color (green)
    static var success: Color {
        Color.green
    }

    /// Warning color (yellow/orange)
    static var warning: Color {
        Color.orange
    }

    /// Error/danger color (red)
    static var error: Color {
        Color.red
    }

    /// VP/Points color (purple/indigo)
    static var vpColor: Color {
        Color.purple
    }

    /// Coins color (gold/yellow)
    static var coinsColor: Color {
        Color.yellow
    }

    /// Streak color (orange/fire)
    static var streakColor: Color {
        Color.orange
    }

    // MARK: - Hex Color Support

    /// Initialize color from hex string (e.g., "#FF5733" or "FF5733")
    init?(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")

        var rgb: UInt64 = 0
        guard Scanner(string: hexSanitized).scanHexInt64(&rgb) else { return nil }

        let length = hexSanitized.count
        let r, g, b, a: Double

        switch length {
        case 6: // RGB
            r = Double((rgb & 0xFF0000) >> 16) / 255.0
            g = Double((rgb & 0x00FF00) >> 8) / 255.0
            b = Double(rgb & 0x0000FF) / 255.0
            a = 1.0
        case 8: // RGBA
            r = Double((rgb & 0xFF000000) >> 24) / 255.0
            g = Double((rgb & 0x00FF0000) >> 16) / 255.0
            b = Double((rgb & 0x0000FF00) >> 8) / 255.0
            a = Double(rgb & 0x000000FF) / 255.0
        default:
            return nil
        }

        self.init(red: r, green: g, blue: b, opacity: a)
    }

    /// Create color from optional hex, with fallback
    static func fromHex(_ hex: String?, fallback: Color = .gray) -> Color {
        guard let hex = hex else { return fallback }
        return Color(hex: hex) ?? fallback
    }
}

// MARK: - Category Color Extension

extension Category {
    /// SwiftUI color for this category
    var swiftUIColor: Color {
        Color.fromHex(color, fallback: .blue)
    }
}
