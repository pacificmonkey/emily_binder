//
//  Card.swift
//  Emily's Missions
//
//  Reusable card container component
//

import SwiftUI

/// Card style variants
enum CardStyle {
    case filled      // Filled background
    case outlined    // Border only
    case elevated    // With shadow
}

/// Reusable card container
struct Card<Content: View>: View {
    let style: CardStyle
    let content: () -> Content

    init(
        style: CardStyle = .filled,
        @ViewBuilder content: @escaping () -> Content
    ) {
        self.style = style
        self.content = content
    }

    var body: some View {
        content()
            .padding(AppSpacing.cardPadding)
            .background(backgroundColor)
            .clipShape(RoundedRectangle(cornerRadius: AppSpacing.radiusLg))
            .overlay(
                RoundedRectangle(cornerRadius: AppSpacing.radiusLg)
                    .stroke(borderColor, lineWidth: style == .outlined ? 1 : 0)
            )
            .shadow(
                color: style == .elevated ? .black.opacity(0.08) : .clear,
                radius: style == .elevated ? AppSpacing.shadowRadiusMd : 0,
                y: style == .elevated ? 2 : 0
            )
    }

    private var backgroundColor: Color {
        switch style {
        case .filled:
            return .secondarySystemGroupedBackground
        case .outlined:
            return .systemBackground
        case .elevated:
            return .systemBackground
        }
    }

    private var borderColor: Color {
        style == .outlined ? .separator : .clear
    }
}

// MARK: - Specialized Card Types

/// Stats card for displaying VP, coins, level
struct StatsCard: View {
    let title: String
    let value: String
    let icon: String
    let iconColor: Color

    var body: some View {
        Card(style: .elevated) {
            HStack(spacing: AppSpacing.space3) {
                Image(systemName: icon)
                    .font(.system(size: AppSpacing.iconSizeLg))
                    .foregroundStyle(iconColor)
                    .frame(width: AppSpacing.iconSize2xl, height: AppSpacing.iconSize2xl)
                    .background(iconColor.opacity(0.15))
                    .clipShape(Circle())

                VStack(alignment: .leading, spacing: AppSpacing.space1) {
                    Text(title)
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    Text(value)
                        .font(.system(size: AppTypography.fontSizeXl, weight: .bold, design: .rounded))
                        .foregroundStyle(.primary)
                }

                Spacer()
            }
        }
    }
}

/// Section header card
struct SectionCard<Content: View>: View {
    let title: String
    let icon: String?
    let content: () -> Content

    init(
        title: String,
        icon: String? = nil,
        @ViewBuilder content: @escaping () -> Content
    ) {
        self.title = title
        self.icon = icon
        self.content = content
    }

    var body: some View {
        Card(style: .filled) {
            VStack(alignment: .leading, spacing: AppSpacing.space3) {
                HStack(spacing: AppSpacing.space2) {
                    if let icon = icon {
                        Image(systemName: icon)
                            .foregroundStyle(AppColors.primary)
                    }

                    Text(title)
                        .font(.headline)
                        .foregroundStyle(.primary)
                }

                content()
            }
        }
    }
}

// MARK: - Previews

#Preview("Card Styles") {
    VStack(spacing: AppSpacing.space4) {
        Card(style: .filled) {
            Text("Filled Card")
        }

        Card(style: .outlined) {
            Text("Outlined Card")
        }

        Card(style: .elevated) {
            Text("Elevated Card")
        }
    }
    .padding()
}

#Preview("Stats Card") {
    VStack(spacing: AppSpacing.space4) {
        StatsCard(
            title: "Victory Points",
            value: "1,250",
            icon: "star.fill",
            iconColor: AppColors.vp
        )

        StatsCard(
            title: "Coins",
            value: "85",
            icon: "bitcoinsign.circle.fill",
            iconColor: AppColors.coins
        )

        StatsCard(
            title: "Level",
            value: "7",
            icon: "arrow.up.circle.fill",
            iconColor: AppColors.level
        )
    }
    .padding()
}
