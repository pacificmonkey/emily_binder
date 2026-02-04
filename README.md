# Emily's Missions

A calm, structured life-management application for a disabled adult user.

## Overview

Emily's Missions helps users manage daily tasks, medications, appointments, budget, and more through gentle gamification (points, levels, coins, streaks) and a personalized Sticker Wall.

## Project Structure

```
EmilyBinder/
├── apps/
│   ├── web/                    # React web application
│   └── ios/                    # SwiftUI iOS/macOS application
├── packages/
│   └── shared/
│       ├── types/              # Generated TypeScript types
│       └── codegen/            # Type generation scripts
├── docs/
│   ├── spec.md                 # Product specification
│   ├── visual-design-spec.md   # Design system specification
│   └── database-spec.json      # Database schema specification
├── supabase/
│   ├── migrations/             # Database migrations
│   ├── seed/                   # Seed data SQL files
│   └── functions/              # Edge functions (if needed)
├── scripts/                    # Build and codegen scripts
├── Previous/                   # ARCHIVED - reference only
├── REBUILD-PLAN.md            # Comprehensive rebuild plan
└── README.md                   # This file
```

## Quick Start

### Prerequisites

- Node.js 18+
- Xcode 15+ (for iOS)
- Supabase CLI
- PostgreSQL (for local development)

### Web Application

```bash
cd apps/web
cp .env.example .env
# Edit .env with your Supabase credentials
npm install
npm run dev
```

### iOS Application

See [apps/ios/README.md](apps/ios/README.md) for iOS setup instructions.

### Supabase Setup

1. Create a new Supabase project or reset your existing one
2. Run migrations:
   ```bash
   cd supabase
   supabase db reset
   ```
3. Run seed data:
   ```bash
   supabase db reset --seed
   ```

## Development Status

| Milestone | Status | Description |
|-----------|--------|-------------|
| 0 - Foundations | ✅ In Progress | Auth, workspace, RBAC, audit |
| 1 - Tasks | ⬜ Pending | Task management, points ledger |
| 2 - Events | ⬜ Pending | Calendar, transition buffers |
| 3 - Notifications | ⬜ Pending | Unified notification system |
| 4 - Medications | ⬜ Pending | Prescriptions, inventory |
| 5 - Health | ⬜ Pending | Routines, symptoms |
| 6 - Budget | ⬜ Pending | Accounts, transactions |
| 7 - Recipes | ⬜ Pending | Recipes, shopping lists |
| 8 - Gamification | ⬜ Pending | Streaks, coins, store |
| 9 - Sticker Wall | ⬜ Pending | Decoration canvas |
| 10 - Admin | ⬜ Pending | Admin panel, security |
| 11 - Polish | ⬜ Pending | Performance, accessibility |

## Documentation

- [Product Specification](docs/spec.md)
- [Visual Design Spec](docs/visual-design-spec.md)
- [Database Schema](docs/database-spec.json)
- [Rebuild Plan](REBUILD-PLAN.md)

## Security

- All data access is controlled via Row Level Security (RLS)
- Workspace boundaries enforce data isolation
- Role-Based Access Control (RBAC) for permissions
- Audit logging for all mutations
- Sensitive access logging for health/budget data

## License

Private - All rights reserved
