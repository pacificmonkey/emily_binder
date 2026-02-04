//
//  Spacing.swift
//  Emily's Missions
//
//  Consistent spacing values and layout constants
//

import SwiftUI

/// App spacing system (based on 4pt grid)
enum AppSpacing {
    // MARK: - Base Spacing

    /// 0pt
    static let space0: CGFloat = 0

    /// 2pt
    static let space0_5: CGFloat = 2

    /// 4pt
    static let space1: CGFloat = 4

    /// 6pt
    static let space1_5: CGFloat = 6

    /// 8pt
    static let space2: CGFloat = 8

    /// 10pt
    static let space2_5: CGFloat = 10

    /// 12pt
    static let space3: CGFloat = 12

    /// 14pt
    static let space3_5: CGFloat = 14

    /// 16pt
    static let space4: CGFloat = 16

    /// 20pt
    static let space5: CGFloat = 20

    /// 24pt
    static let space6: CGFloat = 24

    /// 28pt
    static let space7: CGFloat = 28

    /// 32pt
    static let space8: CGFloat = 32

    /// 36pt
    static let space9: CGFloat = 36

    /// 40pt
    static let space10: CGFloat = 40

    /// 48pt
    static let space12: CGFloat = 48

    /// 64pt
    static let space16: CGFloat = 64

    /// 80pt
    static let space20: CGFloat = 80

    /// 96pt
    static let space24: CGFloat = 96

    // MARK: - Common Paddings

    /// Default horizontal padding for screens
    static let screenHorizontal: CGFloat = space4

    /// Default vertical padding for screens
    static let screenVertical: CGFloat = space4

    /// Card internal padding
    static let cardPadding: CGFloat = space4

    /// Section spacing
    static let sectionSpacing: CGFloat = space6

    /// Item spacing in lists
    static let listItemSpacing: CGFloat = space3

    /// Compact item spacing
    static let compactItemSpacing: CGFloat = space2

    /// Icon spacing from text
    static let iconSpacing: CGFloat = space2

    // MARK: - Corner Radii

    /// Small radius (4pt)
    static let radiusSm: CGFloat = 4

    /// Medium radius (8pt)
    static let radiusMd: CGFloat = 8

    /// Large radius (12pt)
    static let radiusLg: CGFloat = 12

    /// Extra large radius (16pt)
    static let radiusXl: CGFloat = 16

    /// 2XL radius (24pt)
    static let radius2xl: CGFloat = 24

    /// Full/pill radius
    static let radiusFull: CGFloat = 9999

    // MARK: - Icon Sizes

    /// Small icon (16pt)
    static let iconSizeSm: CGFloat = 16

    /// Medium icon (20pt)
    static let iconSizeMd: CGFloat = 20

    /// Large icon (24pt)
    static let iconSizeLg: CGFloat = 24

    /// Extra large icon (32pt)
    static let iconSizeXl: CGFloat = 32

    /// 2XL icon (40pt)
    static let iconSize2xl: CGFloat = 40

    // MARK: - Component Heights

    /// Button height - small
    static let buttonHeightSm: CGFloat = 32

    /// Button height - medium
    static let buttonHeightMd: CGFloat = 40

    /// Button height - large
    static let buttonHeightLg: CGFloat = 48

    /// Input field height
    static let inputHeight: CGFloat = 44

    /// Tab bar height
    static let tabBarHeight: CGFloat = 49

    /// Navigation bar height
    static let navBarHeight: CGFloat = 44

    // MARK: - Shadow

    /// Small shadow radius
    static let shadowRadiusSm: CGFloat = 2

    /// Medium shadow radius
    static let shadowRadiusMd: CGFloat = 4

    /// Large shadow radius
    static let shadowRadiusLg: CGFloat = 8
}

// MARK: - View Extensions for Spacing

extension View {
    /// Apply standard screen padding
    func screenPadding() -> some View {
        self.padding(.horizontal, AppSpacing.screenHorizontal)
            .padding(.vertical, AppSpacing.screenVertical)
    }

    /// Apply card-style corner radius
    func cardCornerRadius() -> some View {
        self.clipShape(RoundedRectangle(cornerRadius: AppSpacing.radiusLg))
    }

    /// Apply standard card styling
    func cardStyle() -> some View {
        self
            .padding(AppSpacing.cardPadding)
            .background(Color.secondarySystemGroupedBackground)
            .clipShape(RoundedRectangle(cornerRadius: AppSpacing.radiusLg))
    }

    /// Apply elevated card styling with shadow
    func elevatedCardStyle() -> some View {
        self
            .padding(AppSpacing.cardPadding)
            .background(Color.systemBackground)
            .clipShape(RoundedRectangle(cornerRadius: AppSpacing.radiusLg))
            .shadow(color: .black.opacity(0.05), radius: AppSpacing.shadowRadiusSm, y: 1)
    }
}

// MARK: - EdgeInsets Extensions

extension EdgeInsets {
    /// Standard card padding
    static var card: EdgeInsets {
        EdgeInsets(
            top: AppSpacing.cardPadding,
            leading: AppSpacing.cardPadding,
            bottom: AppSpacing.cardPadding,
            trailing: AppSpacing.cardPadding
        )
    }

    /// Standard screen padding
    static var screen: EdgeInsets {
        EdgeInsets(
            top: AppSpacing.screenVertical,
            leading: AppSpacing.screenHorizontal,
            bottom: AppSpacing.screenVertical,
            trailing: AppSpacing.screenHorizontal
        )
    }
}
