//
//  ProgressBar.swift
//  Emily's Missions
//
//  Progress indicators and bars
//

import SwiftUI

/// Linear progress bar
struct ProgressBar: View {
    let progress: Double
    let color: Color
    let backgroundColor: Color
    let height: CGFloat
    let showLabel: Bool
    let labelFormat: String?

    init(
        progress: Double,
        color: Color = AppColors.primary,
        backgroundColor: Color = Color.systemFill,
        height: CGFloat = 8,
        showLabel: Bool = false,
        labelFormat: String? = nil
    ) {
        self.progress = min(max(progress, 0), 1) // Clamp 0-1
        self.color = color
        self.backgroundColor = backgroundColor
        self.height = height
        self.showLabel = showLabel
        self.labelFormat = labelFormat
    }

    var body: some View {
        VStack(alignment: .trailing, spacing: AppSpacing.space1) {
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    // Background
                    RoundedRectangle(cornerRadius: height / 2)
                        .fill(backgroundColor)

                    // Progress
                    RoundedRectangle(cornerRadius: height / 2)
                        .fill(color)
                        .frame(width: geometry.size.width * progress)
                        .animation(.easeInOut(duration: 0.3), value: progress)
                }
            }
            .frame(height: height)

            if showLabel {
                Text(labelText)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var labelText: String {
        if let format = labelFormat {
            return format
        }
        return "\(Int(progress * 100))%"
    }
}

/// Circular progress ring
struct ProgressRing: View {
    let progress: Double
    let color: Color
    let backgroundColor: Color
    let lineWidth: CGFloat
    let size: CGFloat

    init(
        progress: Double,
        color: Color = AppColors.primary,
        backgroundColor: Color = Color.systemFill,
        lineWidth: CGFloat = 8,
        size: CGFloat = 60
    ) {
        self.progress = min(max(progress, 0), 1)
        self.color = color
        self.backgroundColor = backgroundColor
        self.lineWidth = lineWidth
        self.size = size
    }

    var body: some View {
        ZStack {
            // Background ring
            Circle()
                .stroke(backgroundColor, lineWidth: lineWidth)

            // Progress ring
            Circle()
                .trim(from: 0, to: progress)
                .stroke(
                    color,
                    style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
                .animation(.easeInOut(duration: 0.3), value: progress)
        }
        .frame(width: size, height: size)
    }
}

/// Goal completion ring with percentage
struct CompletionRing: View {
    let progress: Double
    let size: CGFloat
    let showPercentage: Bool

    init(progress: Double, size: CGFloat = 60, showPercentage: Bool = true) {
        self.progress = progress
        self.size = size
        self.showPercentage = showPercentage
    }

    var body: some View {
        ZStack {
            ProgressRing(
                progress: progress,
                color: progressColor,
                lineWidth: size / 8,
                size: size
            )

            if showPercentage {
                Text("\(Int(progress * 100))%")
                    .font(.system(size: size / 4, weight: .bold, design: .rounded))
                    .foregroundStyle(progressColor)
            }
        }
    }

    private var progressColor: Color {
        if progress >= 1 {
            return AppColors.success
        } else if progress >= 0.5 {
            return AppColors.primary
        } else {
            return AppColors.warning
        }
    }
}

/// Daily win progress bar
struct DailyWinProgress: View {
    let vpEarned: Int
    let threshold: Int

    private var progress: Double {
        guard threshold > 0 else { return 0 }
        return min(Double(vpEarned) / Double(threshold), 1)
    }

    private var isWon: Bool {
        vpEarned >= threshold
    }

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.space2) {
            HStack {
                Text("Daily Win")
                    .font(.subheadline)
                    .fontWeight(.medium)

                Spacer()

                HStack(spacing: AppSpacing.space1) {
                    if isWon {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(AppColors.success)
                    }

                    Text("\(vpEarned)/\(threshold) VP")
                        .font(.caption)
                        .foregroundStyle(isWon ? AppColors.success : .secondary)
                }
            }

            ProgressBar(
                progress: progress,
                color: isWon ? AppColors.success : AppColors.vp,
                height: 6
            )
        }
    }
}

/// Level progress component
struct LevelProgressView: View {
    let currentLevel: Int
    let vpIntoLevel: Int
    let vpNeeded: Int

    private var progress: Double {
        guard vpNeeded > 0 else { return 1 }
        return Double(vpIntoLevel) / Double(vpNeeded)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.space2) {
            HStack {
                Text("Level \(currentLevel)")
                    .font(.headline)
                    .foregroundStyle(AppColors.level)

                Spacer()

                Text("\(vpIntoLevel)/\(vpNeeded) VP")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            ProgressBar(
                progress: progress,
                color: AppColors.level,
                height: 8
            )

            Text("Level \(currentLevel + 1)")
                .font(.caption)
                .foregroundStyle(.tertiary)
                .frame(maxWidth: .infinity, alignment: .trailing)
        }
    }
}

// MARK: - Previews

#Preview("Progress Bars") {
    VStack(spacing: 30) {
        ProgressBar(progress: 0.3)
        ProgressBar(progress: 0.6, color: AppColors.success)
        ProgressBar(progress: 0.9, showLabel: true)
        ProgressBar(progress: 1.0, color: AppColors.vp, showLabel: true, labelFormat: "Complete!")
    }
    .padding()
}

#Preview("Progress Rings") {
    HStack(spacing: 30) {
        ProgressRing(progress: 0.25, color: AppColors.warning, size: 50)
        ProgressRing(progress: 0.5, color: AppColors.primary, size: 60)
        ProgressRing(progress: 0.75, color: AppColors.success, size: 70)
        CompletionRing(progress: 1.0)
    }
    .padding()
}

#Preview("Daily Win Progress") {
    VStack(spacing: 20) {
        DailyWinProgress(vpEarned: 8, threshold: 15)
        DailyWinProgress(vpEarned: 15, threshold: 15)
        DailyWinProgress(vpEarned: 20, threshold: 15)
    }
    .padding()
}

#Preview("Level Progress") {
    LevelProgressView(currentLevel: 7, vpIntoLevel: 120, vpNeeded: 200)
        .padding()
}
