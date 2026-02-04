//
//  SupabaseClient.swift
//  Emily's Missions
//
//  Supabase client configuration
//

import Foundation
import Supabase

/// Supabase client configuration
enum SupabaseConfig {
    static let url = URL(string: "https://bxlbnfarkaaqxpsgwuwk.supabase.co")!
    static let anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bGJuZmFya2FhcXhwc2d3dXdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NDIyNTksImV4cCI6MjA4NTMxODI1OX0.j5HzvsujqoFeKjbnCNyPSRkYT7H8OyXJ0g8d5qw6B_M"
}

/// Shared Supabase client instance
let supabase = SupabaseClient(
    supabaseURL: SupabaseConfig.url,
    supabaseKey: SupabaseConfig.anonKey
)
