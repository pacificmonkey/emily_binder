//
//  Emily_s_MissionsApp.swift
//  Emily's Missions
//
//  Created by Joey Pacific on 2/3/26.
//

import SwiftUI
#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

@main
struct Emily_s_MissionsApp: App {
    @StateObject private var authManager = AuthManager()

    var body: some Scene {
        WindowGroup {
            Group {
                if authManager.isLoading {
                    // Loading state
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(systemBackground)
                } else if authManager.isAuthenticated {
                    // Authenticated - show main app
                    MainTabView()
                } else {
                    // Not authenticated - show login
                    LoginView()
                }
            }
            .environmentObject(authManager)
        }
    }

    private var systemBackground: Color {
        #if canImport(UIKit)
        return Color(UIColor.systemBackground)
        #elseif canImport(AppKit)
        return Color(NSColor.windowBackgroundColor)
        #else
        return Color.white
        #endif
    }
}
