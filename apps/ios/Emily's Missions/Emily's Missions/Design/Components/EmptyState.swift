//
//  EmptyState.swift
//  Emily's Missions
//
//  Empty state placeholder component
//

import SwiftUI

/// Empty state view for when there's no content
struct EmptyState: View {
    let icon: String
    let title: String
    let message: String?
    let actionTitle: String?
    let action: (() -> Void)?

    init(
        icon: String,
        title: String,
        message: String? = nil,
        actionTitle: String? = nil,
        action: (() -> Void)? = nil
    ) {
        self.icon = icon
        self.title = title
        self.message = message
        self.actionTitle = actionTitle
        self.action = action
    }

    var body: some View {
        VStack(spacing: AppSpacing.space4) {
            Image(systemName: icon)
                .font(.system(size: 48))
                .foregroundStyle(Color.tertiaryLabel)

            VStack(spacing: AppSpacing.space2) {
                Text(title)
                    .font(.headline)
                    .foregroundStyle(.primary)

                if let message = message {
                    Text(message)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
            }

            if let actionTitle = actionTitle, let action = action {
                EMButton(actionTitle, icon: "plus", variant: .primary, action: action)
            }
        }
        .padding(AppSpacing.space8)
        .frame(maxWidth: .infinity)
    }
}

/// Inline empty state (smaller, for use within sections)
struct InlineEmptyState: View {
    let message: String
    let icon: String?

    init(_ message: String, icon: String? = nil) {
        self.message = message
        self.icon = icon
    }

    var body: some View {
        HStack(spacing: AppSpacing.space2) {
            if let icon = icon {
                Image(systemName: icon)
                    .foregroundStyle(.tertiary)
            }

            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(AppSpacing.space4)
    }
}

/// Error state view
struct ErrorState: View {
    let title: String
    let message: String?
    let retryAction: (() -> Void)?

    init(
        title: String = "Something went wrong",
        message: String? = nil,
        retryAction: (() -> Void)? = nil
    ) {
        self.title = title
        self.message = message
        self.retryAction = retryAction
    }

    var body: some View {
        VStack(spacing: AppSpacing.space4) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 48))
                .foregroundStyle(AppColors.warning)

            VStack(spacing: AppSpacing.space2) {
                Text(title)
                    .font(.headline)
                    .foregroundStyle(.primary)

                if let message = message {
                    Text(message)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
            }

            if let retryAction = retryAction {
                EMButton("Try Again", icon: "arrow.clockwise", variant: .secondary, action: retryAction)
            }
        }
        .padding(AppSpacing.space8)
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Common Empty States

extension EmptyState {
    /// Empty state for missions
    static func noMissions(action: @escaping () -> Void) -> EmptyState {
        EmptyState(
            icon: "checkmark.circle",
            title: "No missions today",
            message: "You're all caught up! Add a new mission to get started.",
            actionTitle: "Add Mission",
            action: action
        )
    }

    /// Empty state for events
    static func noEvents(action: @escaping () -> Void) -> EmptyState {
        EmptyState(
            icon: "calendar",
            title: "No events",
            message: "No events scheduled. Add an event to your calendar.",
            actionTitle: "Add Event",
            action: action
        )
    }

    /// Empty state for goals
    static func noGoals(action: @escaping () -> Void) -> EmptyState {
        EmptyState(
            icon: "star.circle",
            title: "No goals yet",
            message: "Create your first goal to track your progress.",
            actionTitle: "Create Goal",
            action: action
        )
    }

    /// Empty state for medications
    static func noMedications(action: @escaping () -> Void) -> EmptyState {
        EmptyState(
            icon: "pills",
            title: "No medications",
            message: "Add your medications to track them.",
            actionTitle: "Add Medication",
            action: action
        )
    }

    /// Empty state for stickers
    static func noStickers() -> EmptyState {
        EmptyState(
            icon: "star.square.on.square",
            title: "No stickers yet",
            message: "Visit the shop to purchase stickers with your coins!"
        )
    }
}

// MARK: - Previews

#Preview("Empty State") {
    VStack {
        EmptyState(
            icon: "checkmark.circle",
            title: "No missions",
            message: "You're all caught up for today!",
            actionTitle: "Add Mission"
        ) {
            print("Add tapped")
        }
    }
}

#Preview("Inline Empty State") {
    VStack {
        InlineEmptyState("No items to display", icon: "tray")
    }
    .padding()
}

#Preview("Error State") {
    ErrorState(
        title: "Failed to load",
        message: "Please check your connection and try again.",
        retryAction: { print("Retry") }
    )
}
