//
//  EMButton.swift
//  Emily's Missions
//
//  Custom button component with variants and sizes
//

import SwiftUI

/// Button style variants
enum EMButtonVariant {
    case primary     // Filled with primary color
    case secondary   // Outlined
    case ghost       // Text only
    case destructive // Red for dangerous actions
}

/// Button sizes
enum EMButtonSize {
    case small
    case medium
    case large

    var height: CGFloat {
        switch self {
        case .small: return AppSpacing.buttonHeightSm
        case .medium: return AppSpacing.buttonHeightMd
        case .large: return AppSpacing.buttonHeightLg
        }
    }

    var horizontalPadding: CGFloat {
        switch self {
        case .small: return AppSpacing.space3
        case .medium: return AppSpacing.space4
        case .large: return AppSpacing.space5
        }
    }

    var fontSize: CGFloat {
        switch self {
        case .small: return AppTypography.fontSizeSm
        case .medium: return AppTypography.fontSizeBase
        case .large: return AppTypography.fontSizeMd
        }
    }
}

/// Custom button component
struct EMButton: View {
    let title: String
    let icon: String?
    let variant: EMButtonVariant
    let size: EMButtonSize
    let isLoading: Bool
    let isFullWidth: Bool
    let action: () -> Void

    init(
        _ title: String,
        icon: String? = nil,
        variant: EMButtonVariant = .primary,
        size: EMButtonSize = .medium,
        isLoading: Bool = false,
        isFullWidth: Bool = false,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.icon = icon
        self.variant = variant
        self.size = size
        self.isLoading = isLoading
        self.isFullWidth = isFullWidth
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: AppSpacing.space2) {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: foregroundColor))
                        .scaleEffect(0.8)
                } else {
                    if let icon = icon {
                        Image(systemName: icon)
                            .font(.system(size: size.fontSize))
                    }

                    Text(title)
                        .font(.system(size: size.fontSize, weight: .semibold))
                }
            }
            .frame(height: size.height)
            .frame(maxWidth: isFullWidth ? .infinity : nil)
            .padding(.horizontal, size.horizontalPadding)
            .foregroundStyle(foregroundColor)
            .background(backgroundColor)
            .clipShape(RoundedRectangle(cornerRadius: AppSpacing.radiusMd))
            .overlay(
                RoundedRectangle(cornerRadius: AppSpacing.radiusMd)
                    .stroke(borderColor, lineWidth: variant == .secondary ? 1 : 0)
            )
        }
        .disabled(isLoading)
        .opacity(isLoading ? 0.7 : 1)
    }

    private var foregroundColor: Color {
        switch variant {
        case .primary:
            return .white
        case .secondary:
            return AppColors.primary
        case .ghost:
            return AppColors.primary
        case .destructive:
            return .white
        }
    }

    private var backgroundColor: Color {
        switch variant {
        case .primary:
            return AppColors.primary
        case .secondary:
            return .clear
        case .ghost:
            return .clear
        case .destructive:
            return AppColors.error
        }
    }

    private var borderColor: Color {
        switch variant {
        case .secondary:
            return AppColors.primary
        default:
            return .clear
        }
    }
}

// MARK: - Icon-Only Button

struct IconButton: View {
    let icon: String
    let size: EMButtonSize
    let action: () -> Void

    init(
        _ icon: String,
        size: EMButtonSize = .medium,
        action: @escaping () -> Void
    ) {
        self.icon = icon
        self.size = size
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: size.fontSize))
                .frame(width: size.height, height: size.height)
                .foregroundStyle(AppColors.primary)
                .background(AppColors.primarySubtle)
                .clipShape(Circle())
        }
    }
}

// MARK: - Floating Action Button

struct FloatingActionButton: View {
    let icon: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: AppTypography.fontSizeXl, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 56, height: 56)
                .background(AppColors.primary)
                .clipShape(Circle())
                .shadow(color: AppColors.primary.opacity(0.3), radius: 8, y: 4)
        }
    }
}

// MARK: - Previews

#Preview("Button Variants") {
    VStack(spacing: AppSpacing.space4) {
        EMButton("Primary", icon: "plus", variant: .primary) {}
        EMButton("Secondary", icon: "pencil", variant: .secondary) {}
        EMButton("Ghost", variant: .ghost) {}
        EMButton("Destructive", icon: "trash", variant: .destructive) {}
        EMButton("Loading", variant: .primary, isLoading: true) {}
        EMButton("Full Width", variant: .primary, isFullWidth: true) {}
    }
    .padding()
}

#Preview("Button Sizes") {
    VStack(spacing: AppSpacing.space4) {
        EMButton("Small", size: .small) {}
        EMButton("Medium", size: .medium) {}
        EMButton("Large", size: .large) {}
    }
    .padding()
}

#Preview("Icon Buttons") {
    HStack(spacing: AppSpacing.space4) {
        IconButton("plus") {}
        IconButton("pencil", size: .large) {}
        FloatingActionButton(icon: "plus") {}
    }
    .padding()
}
