//
//  Typography.swift
//  Emily's Missions
//
//  Font scales and text styles
//

import SwiftUI

/// App typography system
enum AppTypography {
    // MARK: - Font Sizes

    /// Extra small (10pt)
    static let fontSizeXs: CGFloat = 10

    /// Small (12pt)
    static let fontSizeSm: CGFloat = 12

    /// Base (14pt)
    static let fontSizeBase: CGFloat = 14

    /// Medium (16pt)
    static let fontSizeMd: CGFloat = 16

    /// Large (18pt)
    static let fontSizeLg: CGFloat = 18

    /// Extra large (20pt)
    static let fontSizeXl: CGFloat = 20

    /// 2XL (24pt)
    static let fontSize2xl: CGFloat = 24

    /// 3XL (30pt)
    static let fontSize3xl: CGFloat = 30

    /// 4XL (36pt)
    static let fontSize4xl: CGFloat = 36

    // MARK: - Line Heights

    static let lineHeightTight: CGFloat = 1.25
    static let lineHeightNormal: CGFloat = 1.5
    static let lineHeightRelaxed: CGFloat = 1.75

    // MARK: - Letter Spacing

    static let trackingTight: CGFloat = -0.5
    static let trackingNormal: CGFloat = 0
    static let trackingWide: CGFloat = 0.5
}

// MARK: - Custom Font Modifiers

extension View {
    /// Large title style
    func largeTitle() -> some View {
        self
            .font(.system(size: AppTypography.fontSize3xl, weight: .bold))
    }

    /// Title 1 style
    func title1() -> some View {
        self
            .font(.system(size: AppTypography.fontSize2xl, weight: .bold))
    }

    /// Title 2 style
    func title2() -> some View {
        self
            .font(.system(size: AppTypography.fontSizeXl, weight: .semibold))
    }

    /// Title 3 style
    func title3() -> some View {
        self
            .font(.system(size: AppTypography.fontSizeLg, weight: .semibold))
    }

    /// Headline style
    func headline() -> some View {
        self
            .font(.system(size: AppTypography.fontSizeMd, weight: .semibold))
    }

    /// Body style
    func bodyStyle() -> some View {
        self
            .font(.system(size: AppTypography.fontSizeBase, weight: .regular))
    }

    /// Callout style
    func callout() -> some View {
        self
            .font(.system(size: AppTypography.fontSizeSm, weight: .regular))
    }

    /// Caption style
    func caption() -> some View {
        self
            .font(.system(size: AppTypography.fontSizeXs, weight: .regular))
    }

    /// Caption 2 style (smaller)
    func caption2() -> some View {
        self
            .font(.system(size: AppTypography.fontSizeXs, weight: .medium))
    }
}

// MARK: - Text Styles

extension Text {
    /// VP display style (large, bold, purple)
    func vpStyle() -> some View {
        self
            .font(.system(size: AppTypography.fontSizeXl, weight: .bold, design: .rounded))
            .foregroundStyle(AppColors.vp)
    }

    /// Coins display style (large, bold, gold)
    func coinsStyle() -> some View {
        self
            .font(.system(size: AppTypography.fontSizeXl, weight: .bold, design: .rounded))
            .foregroundStyle(AppColors.coins)
    }

    /// Level display style
    func levelStyle() -> some View {
        self
            .font(.system(size: AppTypography.fontSizeLg, weight: .bold, design: .rounded))
            .foregroundStyle(AppColors.level)
    }

    /// Streak display style
    func streakStyle() -> some View {
        self
            .font(.system(size: AppTypography.fontSizeLg, weight: .bold, design: .rounded))
            .foregroundStyle(AppColors.streak)
    }

    /// Muted text style
    func muted() -> some View {
        self
            .foregroundStyle(Color.secondaryLabel)
    }

    /// Error text style
    func errorStyle() -> some View {
        self
            .foregroundStyle(AppColors.error)
    }

    /// Success text style
    func successStyle() -> some View {
        self
            .foregroundStyle(AppColors.success)
    }

    /// Warning text style
    func warningStyle() -> some View {
        self
            .foregroundStyle(AppColors.warning)
    }
}
