//
//  TodayView.swift
//  Emily's Missions
//
//  Main Today screen showing daily overview
//

import SwiftUI
import Auth
#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

struct TodayView: View {
    @EnvironmentObject private var authManager: AuthManager

    private var systemBackground: Color {
        #if canImport(UIKit)
        return Color(UIColor.systemBackground)
        #elseif canImport(AppKit)
        return Color(NSColor.windowBackgroundColor)
        #else
        return Color.white
        #endif
    }

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
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    // Header
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Welcome back!")
                            .font(.title)
                            .fontWeight(.bold)

                        if let email = authManager.user?.email {
                            Text(email)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.horizontal)

                    // Placeholder content
                    VStack(spacing: 16) {
                        Text("Today's Overview")
                            .font(.headline)
                            .frame(maxWidth: .infinity, alignment: .leading)

                        // Placeholder card
                        VStack(spacing: 12) {
                            Text("Your tasks and progress will appear here.")
                                .foregroundStyle(.secondary)

                            Text("This is Milestone 0 - basic auth is working.")
                                .font(.caption)
                                .foregroundStyle(.tertiary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(32)
                        .background(systemBackground)
                        .cornerRadius(12)
                        .shadow(color: .black.opacity(0.05), radius: 2, y: 1)
                    }
                    .padding(.horizontal)
                }
                .padding(.vertical)
            }
            .background(groupedBackground)
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                #if os(iOS)
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button("Sign Out", role: .destructive) {
                            Task {
                                await authManager.signOut()
                            }
                        }
                    } label: {
                        Image(systemName: "person.circle")
                    }
                }
                #else
                ToolbarItem(placement: .automatic) {
                    Menu {
                        Button("Sign Out", role: .destructive) {
                            Task {
                                await authManager.signOut()
                            }
                        }
                    } label: {
                        Image(systemName: "person.circle")
                    }
                }
                #endif
            }
        }
    }
}

#Preview {
    TodayView()
        .environmentObject(AuthManager())
}
