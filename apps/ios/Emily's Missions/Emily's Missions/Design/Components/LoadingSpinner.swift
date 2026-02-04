//
//  LoadingSpinner.swift
//  Emily's Missions
//
//  Loading indicators and states
//

import SwiftUI

/// Loading spinner component
struct LoadingSpinner: View {
    let message: String?
    let size: CGFloat

    init(message: String? = nil, size: CGFloat = 32) {
        self.message = message
        self.size = size
    }

    var body: some View {
        VStack(spacing: AppSpacing.space3) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: AppColors.primary))
                .scaleEffect(size / 32)

            if let message = message {
                Text(message)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

/// Full-screen loading view
struct LoadingView: View {
    let message: String?

    init(_ message: String? = "Loading...") {
        self.message = message
    }

    var body: some View {
        VStack(spacing: AppSpacing.space4) {
            LoadingSpinner(message: message, size: 48)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.systemBackground)
    }
}

/// Loading overlay
struct LoadingOverlay<Content: View>: View {
    let isLoading: Bool
    let message: String?
    let content: () -> Content

    init(
        isLoading: Bool,
        message: String? = nil,
        @ViewBuilder content: @escaping () -> Content
    ) {
        self.isLoading = isLoading
        self.message = message
        self.content = content
    }

    var body: some View {
        ZStack {
            content()
                .disabled(isLoading)
                .opacity(isLoading ? 0.5 : 1)

            if isLoading {
                LoadingSpinner(message: message)
                    .padding()
                    .background(Color.systemBackground.opacity(0.9))
                    .clipShape(RoundedRectangle(cornerRadius: AppSpacing.radiusLg))
                    .shadow(radius: 10)
            }
        }
    }
}

/// Skeleton loading placeholder
struct SkeletonView: View {
    let width: CGFloat?
    let height: CGFloat

    @State private var isAnimating = false

    init(width: CGFloat? = nil, height: CGFloat = 20) {
        self.width = width
        self.height = height
    }

    var body: some View {
        RoundedRectangle(cornerRadius: AppSpacing.radiusSm)
            .fill(
                LinearGradient(
                    colors: [
                        Color.gray.opacity(0.2),
                        Color.gray.opacity(0.3),
                        Color.gray.opacity(0.2)
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .frame(width: width, height: height)
            .opacity(isAnimating ? 0.6 : 1)
            .animation(
                Animation.easeInOut(duration: 1)
                    .repeatForever(autoreverses: true),
                value: isAnimating
            )
            .onAppear {
                isAnimating = true
            }
    }
}

/// Skeleton card for loading states
struct SkeletonCard: View {
    var body: some View {
        Card(style: .filled) {
            VStack(alignment: .leading, spacing: AppSpacing.space3) {
                SkeletonView(width: 150, height: 16)
                SkeletonView(height: 14)
                SkeletonView(width: 100, height: 14)
            }
        }
    }
}

// MARK: - Previews

#Preview("Loading Spinner") {
    VStack(spacing: 40) {
        LoadingSpinner()

        LoadingSpinner(message: "Loading missions...")

        LoadingSpinner(message: "Please wait", size: 48)
    }
}

#Preview("Loading View") {
    LoadingView("Fetching your data...")
}

#Preview("Loading Overlay") {
    LoadingOverlay(isLoading: true, message: "Saving...") {
        VStack {
            Text("Content behind overlay")
            EMButton("Submit") {}
        }
        .padding()
    }
}

#Preview("Skeleton Views") {
    VStack(spacing: 20) {
        SkeletonView(width: 200, height: 20)
        SkeletonView(height: 16)
        SkeletonCard()
    }
    .padding()
}
