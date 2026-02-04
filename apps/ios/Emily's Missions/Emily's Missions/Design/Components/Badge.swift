//
//  Badge.swift
//  Emily's Missions
//
//  Status badges and tags
//

import SwiftUI

/// Badge style variants
enum BadgeVariant {
    case filled
    case subtle
    case outlined
}

/// Badge component for status indicators
struct StatusBadge: View {
    let text: String
    let color: Color
    let variant: BadgeVariant
    let icon: String?

    init(
        _ text: String,
        color: Color = AppColors.primary,
        variant: BadgeVariant = .subtle,
        icon: String? = nil
    ) {
        self.text = text
        self.color = color
        self.variant = variant
        self.icon = icon
    }

    var body: some View {
        HStack(spacing: AppSpacing.space1) {
            if let icon = icon {
                Image(systemName: icon)
                    .font(.system(size: 10, weight: .semibold))
            }

            Text(text)
                .font(.system(size: 11, weight: .semibold))
        }
        .padding(.horizontal, AppSpacing.space2)
        .padding(.vertical, AppSpacing.space1)
        .foregroundStyle(foregroundColor)
        .background(backgroundColor)
        .clipShape(Capsule())
        .overlay(
            Capsule()
                .stroke(borderColor, lineWidth: variant == .outlined ? 1 : 0)
        )
    }

    private var foregroundColor: Color {
        switch variant {
        case .filled:
            return .white
        case .subtle, .outlined:
            return color
        }
    }

    private var backgroundColor: Color {
        switch variant {
        case .filled:
            return color
        case .subtle:
            return color.opacity(0.15)
        case .outlined:
            return .clear
        }
    }

    private var borderColor: Color {
        variant == .outlined ? color : .clear
    }
}

/// VP badge
struct VPBadge: View {
    let amount: Int

    var body: some View {
        StatusBadge(
            "\(amount) VP",
            color: AppColors.vp,
            variant: .subtle,
            icon: "star.fill"
        )
    }
}

/// Coins badge
struct CoinsBadge: View {
    let amount: Int

    var body: some View {
        StatusBadge(
            "\(amount)",
            color: AppColors.coins,
            variant: .subtle,
            icon: "bitcoinsign.circle.fill"
        )
    }
}

/// Category badge
struct CategoryBadge: View {
    let category: Category

    var body: some View {
        HStack(spacing: AppSpacing.space1) {
            if let icon = category.icon {
                Image(systemName: icon)
                    .font(.system(size: 10))
            }

            Text(category.name)
                .font(.system(size: 11, weight: .medium))
        }
        .padding(.horizontal, AppSpacing.space2)
        .padding(.vertical, AppSpacing.space1)
        .foregroundStyle(category.swiftUIColor)
        .background(category.swiftUIColor.opacity(0.15))
        .clipShape(Capsule())
    }
}

/// Event category badge
struct EventCategoryBadge: View {
    let category: EventCategory

    var body: some View {
        HStack(spacing: AppSpacing.space1) {
            Image(systemName: category.icon)
                .font(.system(size: 10))

            Text(category.rawValue.capitalized)
                .font(.system(size: 11, weight: .medium))
        }
        .padding(.horizontal, AppSpacing.space2)
        .padding(.vertical, AppSpacing.space1)
        .foregroundStyle(AppColors.eventColor(for: category))
        .background(AppColors.eventColor(for: category).opacity(0.15))
        .clipShape(Capsule())
    }
}

/// Streak badge
struct StreakBadge: View {
    let weeks: Int

    var body: some View {
        HStack(spacing: AppSpacing.space1) {
            Image(systemName: icon)
                .font(.system(size: 10))

            Text("\(weeks) week\(weeks == 1 ? "" : "s")")
                .font(.system(size: 11, weight: .semibold))
        }
        .padding(.horizontal, AppSpacing.space2)
        .padding(.vertical, AppSpacing.space1)
        .foregroundStyle(AppColors.streak)
        .background(AppColors.streakSubtle)
        .clipShape(Capsule())
    }

    private var icon: String {
        if weeks >= 52 { return "flame.fill" }
        if weeks >= 12 { return "star.fill" }
        if weeks >= 4 { return "bolt.fill" }
        return "checkmark.circle.fill"
    }
}

/// Risk level badge (for medication supply)
struct RiskBadge: View {
    let level: SupplyRiskLevel
    let message: String?

    init(level: SupplyRiskLevel, message: String? = nil) {
        self.level = level
        self.message = message
    }

    var body: some View {
        StatusBadge(
            message ?? level.rawValue.capitalized,
            color: AppColors.supplyRiskColor(for: level),
            variant: .subtle,
            icon: icon
        )
    }

    private var icon: String {
        switch level {
        case .ok: return "checkmark.circle.fill"
        case .warning: return "exclamationmark.triangle.fill"
        case .critical: return "exclamationmark.circle.fill"
        }
    }
}

/// Mandatory/required badge
struct MandatoryBadge: View {
    var body: some View {
        StatusBadge(
            "Required",
            color: AppColors.error,
            variant: .subtle,
            icon: "exclamationmark.circle"
        )
    }
}

/// Recurring badge
struct RecurringBadge: View {
    var body: some View {
        StatusBadge(
            "Recurring",
            color: AppColors.info,
            variant: .subtle,
            icon: "arrow.triangle.2.circlepath"
        )
    }
}

/// Completed badge
struct CompletedBadge: View {
    var body: some View {
        StatusBadge(
            "Done",
            color: AppColors.success,
            variant: .subtle,
            icon: "checkmark"
        )
    }
}

// MARK: - Numeric Badges

/// Count badge (for notifications, etc.)
struct CountBadge: View {
    let count: Int

    var body: some View {
        if count > 0 {
            Text(count > 99 ? "99+" : "\(count)")
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(.white)
                .padding(.horizontal, count > 9 ? 6 : 0)
                .frame(minWidth: 18, minHeight: 18)
                .background(AppColors.error)
                .clipShape(Capsule())
        }
    }
}

// MARK: - Previews

#Preview("Status Badges") {
    VStack(spacing: 20) {
        HStack(spacing: 10) {
            StatusBadge("Default", color: AppColors.primary, variant: .subtle)
            StatusBadge("Filled", color: AppColors.primary, variant: .filled)
            StatusBadge("Outlined", color: AppColors.primary, variant: .outlined)
        }

        HStack(spacing: 10) {
            StatusBadge("Success", color: AppColors.success, icon: "checkmark")
            StatusBadge("Warning", color: AppColors.warning, icon: "exclamationmark.triangle")
            StatusBadge("Error", color: AppColors.error, icon: "xmark")
        }
    }
    .padding()
}

#Preview("Specialized Badges") {
    VStack(spacing: 20) {
        HStack(spacing: 10) {
            VPBadge(amount: 15)
            CoinsBadge(amount: 85)
        }

        HStack(spacing: 10) {
            StreakBadge(weeks: 3)
            StreakBadge(weeks: 12)
            StreakBadge(weeks: 52)
        }

        HStack(spacing: 10) {
            RiskBadge(level: .ok)
            RiskBadge(level: .warning, message: "Low Supply")
            RiskBadge(level: .critical, message: "Critical")
        }

        HStack(spacing: 10) {
            MandatoryBadge()
            RecurringBadge()
            CompletedBadge()
        }
    }
    .padding()
}

#Preview("Count Badges") {
    HStack(spacing: 20) {
        ZStack(alignment: .topTrailing) {
            Image(systemName: "bell.fill")
                .font(.title)
            CountBadge(count: 3)
                .offset(x: 8, y: -8)
        }

        ZStack(alignment: .topTrailing) {
            Image(systemName: "envelope.fill")
                .font(.title)
            CountBadge(count: 99)
                .offset(x: 8, y: -8)
        }

        ZStack(alignment: .topTrailing) {
            Image(systemName: "message.fill")
                .font(.title)
            CountBadge(count: 150)
                .offset(x: 8, y: -8)
        }
    }
    .padding()
}
