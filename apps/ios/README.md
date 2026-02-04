# Emily's Missions - iOS App

SwiftUI iOS/macOS application for Emily's Missions.

## Requirements

- Xcode 15.0+
- iOS 17.0+ / macOS 14.0+
- Swift 5.9+

## Setup

### 1. Add Supabase Swift SDK

Open the Xcode project and add the Supabase Swift SDK via Swift Package Manager:

1. File → Add Package Dependencies...
2. Enter: `https://github.com/supabase/supabase-swift`
3. Select version: `2.0.0` or later
4. Add to target: `Emily's Missions`

### 2. Configure Supabase Credentials

Edit `Core/Network/SupabaseClient.swift` and replace the placeholder values:

```swift
enum SupabaseConfig {
    static let url = URL(string: "https://your-project.supabase.co")!
    static let anonKey = "your-anon-key-here"
}
```

**Security Note:** For production, consider using environment variables or a configuration file that's not committed to git.

### 3. Build and Run

1. Open `Emily's Missions.xcodeproj` in Xcode
2. Select your target device/simulator
3. Build and run (⌘R)

## Architecture

```
Emily's Missions/
├── App/
│   └── Emily_s_MissionsApp.swift      # Entry point, auth state
├── Core/
│   ├── Auth/
│   │   └── AuthManager.swift          # Authentication management
│   └── Network/
│       └── SupabaseClient.swift       # Supabase client singleton
├── Design/
│   ├── Tokens/                        # Design tokens (colors, spacing)
│   └── Components/                    # Reusable UI components
├── Features/
│   ├── Today/                         # Today screen + login
│   │   ├── LoginView.swift
│   │   ├── TodayView.swift
│   │   └── MainTabView.swift
│   └── ...                            # Other feature modules
├── Models/                            # Data models
└── Services/                          # API services
```

## Current Status

**Milestone 0:** Basic authentication flow is implemented.

- [x] Login view
- [x] Sign up flow
- [x] Session persistence
- [x] Sign out
- [x] Tab bar navigation shell
- [ ] User/workspace profile fetch
- [ ] Feature module checks

## Next Steps (Milestone 1)

- Task list view
- Task completion flow
- Points display
