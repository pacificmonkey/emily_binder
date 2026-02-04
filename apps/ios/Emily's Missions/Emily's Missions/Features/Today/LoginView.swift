//
//  LoginView.swift
//  Emily's Missions
//
//  Login and sign up view
//

import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

struct LoginView: View {
    @EnvironmentObject private var authManager: AuthManager

    @State private var email = ""
    @State private var password = ""
    @State private var isSignUp = false
    @State private var isLoading = false

    var body: some View {
        VStack(spacing: 32) {
            // Logo and title
            VStack(spacing: 8) {
                Text("✨")
                    .font(.system(size: 48))

                Text("Emily's Missions")
                    .font(.title)
                    .fontWeight(.bold)

                Text(isSignUp ? "Create your account" : "Sign in to continue")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .padding(.top, 40)

            // Form
            VStack(spacing: 16) {
                // Error message
                if let error = authManager.errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(8)
                }

                // Email field
                VStack(alignment: .leading, spacing: 4) {
                    Text("Email")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    TextField("Enter your email", text: $email)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.emailAddress)
                        #if os(iOS)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.emailAddress)
                        #endif
                }

                // Password field
                VStack(alignment: .leading, spacing: 4) {
                    Text("Password")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    SecureField("Enter your password", text: $password)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(isSignUp ? .newPassword : .password)
                }

                // Submit button
                Button(action: submit) {
                    if isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text(isSignUp ? "Sign Up" : "Sign In")
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.accentColor)
                .foregroundStyle(.white)
                .cornerRadius(10)
                .disabled(isLoading || email.isEmpty || password.isEmpty)
            }
            .padding(.horizontal)

            // Toggle sign up / sign in
            Button(action: { isSignUp.toggle() }) {
                Text(isSignUp
                    ? "Already have an account? Sign in"
                    : "Don't have an account? Sign up")
                    .font(.footnote)
                    .foregroundStyle(Color.accentColor)
            }

            Spacer()
        }
        .padding()
    }

    private func submit() {
        Task {
            isLoading = true
            defer { isLoading = false }

            do {
                if isSignUp {
                    try await authManager.signUp(email: email, password: password)
                } else {
                    try await authManager.signIn(email: email, password: password)
                }
            } catch {
                // Error is handled by AuthManager
            }
        }
    }
}

#Preview {
    LoginView()
        .environmentObject(AuthManager())
}
