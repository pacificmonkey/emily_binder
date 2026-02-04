//
//  MainTabView.swift
//  Emily's Missions
//
//  Main tab bar navigation for the app
//

import SwiftUI
#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

struct MainTabView: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            TodayView()
                .tabItem {
                    Label("Today", systemImage: "house.fill")
                }
                .tag(0)

            PlaceholderView(title: "Tasks", icon: "checkmark.circle.fill")
                .tabItem {
                    Label("Tasks", systemImage: "checkmark.circle.fill")
                }
                .tag(1)

            PlaceholderView(title: "Calendar", icon: "calendar")
                .tabItem {
                    Label("Calendar", systemImage: "calendar")
                }
                .tag(2)

            PlaceholderView(title: "Health", icon: "heart.fill")
                .tabItem {
                    Label("Health", systemImage: "heart.fill")
                }
                .tag(3)

            PlaceholderView(title: "Shop", icon: "bag.fill")
                .tabItem {
                    Label("Shop", systemImage: "bag.fill")
                }
                .tag(4)
        }
    }
}

/// Placeholder view for tabs not yet implemented
struct PlaceholderView: View {
    let title: String
    let icon: String

    private var groupedBackground: Color {
        #if canImport(UIKit)
        return Color(UIColor.systemGroupedBackground)
        #elseif canImport(AppKit)
        return Color(NSColor.windowBackgroundColor)
        #else
        return Color(white: 0.95)
        #endif
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                Image(systemName: icon)
                    .font(.system(size: 48))
                    .foregroundStyle(.secondary)

                Text(title)
                    .font(.title2)
                    .fontWeight(.semibold)

                Text("Coming soon in a future milestone")
                    .font(.subheadline)
                    .foregroundStyle(.tertiary)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(groupedBackground)
            .navigationTitle(title)
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
        }
    }
}

#Preview {
    MainTabView()
        .environmentObject(AuthManager())
}
