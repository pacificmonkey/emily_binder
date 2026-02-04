//
//  AuthManager.swift
//  Emily's Missions
//
//  Manages authentication state and operations
//

import Foundation
import Supabase
import Combine

/// Manages authentication state for the application
@MainActor
final class AuthManager: ObservableObject {
    /// Current authenticated user
    @Published private(set) var user: User?

    /// Current session
    @Published private(set) var session: Session?

    /// Loading state for auth operations
    @Published private(set) var isLoading = true

    /// Error message from last operation
    @Published var errorMessage: String?

    /// Whether user is authenticated
    var isAuthenticated: Bool {
        session != nil
    }

    private var authStateTask: Task<Void, Never>?

    init() {
        // Start listening to auth state changes
        authStateTask = Task {
            await setupAuthStateListener()
        }
    }

    deinit {
        authStateTask?.cancel()
    }

    /// Set up listener for auth state changes
    private func setupAuthStateListener() async {
        // Get initial session
        do {
            let session = try await supabase.auth.session
            self.session = session
            self.user = session.user
        } catch {
            // No session or error - user is not authenticated
            self.session = nil
            self.user = nil
        }

        isLoading = false

        // Listen for auth state changes
        for await (event, session) in supabase.auth.authStateChanges {
            switch event {
            case .signedIn, .tokenRefreshed:
                self.session = session
                self.user = session?.user
            case .signedOut:
                self.session = nil
                self.user = nil
            default:
                break
            }
        }
    }

    /// Sign in with email and password
    func signIn(email: String, password: String) async throws {
        errorMessage = nil

        do {
            let session = try await supabase.auth.signIn(
                email: email,
                password: password
            )
            self.session = session
            self.user = session.user
        } catch {
            errorMessage = error.localizedDescription
            throw error
        }
    }

    /// Sign up with email and password
    func signUp(email: String, password: String) async throws {
        errorMessage = nil

        do {
            let result = try await supabase.auth.signUp(
                email: email,
                password: password
            )

            // Check if email confirmation is required
            if result.session != nil {
                self.session = result.session
                self.user = result.user
            } else {
                // Email confirmation required
                errorMessage = "Please check your email to confirm your account."
            }
        } catch {
            errorMessage = error.localizedDescription
            throw error
        }
    }

    /// Sign out the current user
    func signOut() async {
        do {
            try await supabase.auth.signOut()
            session = nil
            user = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
