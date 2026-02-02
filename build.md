# Emily Mission Log - Build Plan

## Overview

A tablet-first (iPad) planner + light gamification system for Emily with mood tracking and health management.

**Tech Stack:**
- Frontend: Vite + React + TypeScript + CSS Modules
- Backend: Supabase (PostgreSQL + Auth + Storage)
- Hosting: Netlify
- Key Libraries: date-fns, framer-motion, react-query, zustand, react-dnd

---

## Phase 1: Project Setup & Infrastructure

### 1.1 Initialize Project
```bash
npm create vite@latest . -- --template react-ts
npm install @supabase/supabase-js react-router-dom date-fns date-fns-tz zustand framer-motion @tanstack/react-query react-dnd react-dnd-touch-backend
npm install -D @types/react @types/react-dom vitest @testing-library/react
```

### 1.2 Directory Structure
```
src/
├── components/
│   ├── ui/           # Button, Card, Modal, Input, TouchButton
│   ├── layout/       # AppLayout, Header, BottomNav
│   ├── missions/     # MissionCard, MissionList, AddMissionFlow
│   ├── calendar/     # WeekView, MonthView, EventCard
│   ├── gamification/ # VPDisplay, LevelBadge, CoinCounter
│   ├── mood/         # QuadrantPicker, FeelingsPicker, MoodWidget
│   ├── health/       # MedList, CareTeam, RefillAlert
│   ├── stickers/     # StickerShop, StickerCanvas
│   └── admin/        # JoeyDashboard, ProposalsInbox
├── hooks/            # useAuth, usePermissions, useMissions, etc.
├── contexts/         # AuthContext, ThemeContext
├── lib/
│   ├── supabase.ts   # Client config + typed client
│   ├── timezone.ts   # America/New_York utilities
│   └── utils.ts      # Helpers
├── types/            # TypeScript definitions
├── pages/            # Home, Today, Calendar, Health, Goals, Shop, Admin
├── services/         # API layer (missions, events, economy, health)
└── styles/           # Global CSS, variables, component modules
```

### 1.3 Configuration Files

**vite.config.ts** - Path aliases, CSS Modules config, build optimization
**.env.local** - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### 1.4 CSS Architecture (CSS Modules)
```
src/styles/
├── variables.css    # CSS custom properties (colors, spacing, animations)
├── global.css       # Reset, base styles, utility classes
└── components/      # Component-specific .module.css files co-located

# Variables will include:
# - Calm color palette (--color-calm-50 through --color-calm-900)
# - Touch target sizes (--touch-min: 44px)
# - Animation timings (--duration-sparkle, --ease-gentle)
# - Spacing scale
```

---

## Phase 2: Database Schema (Supabase)

### 2.1 Migration Order (respecting foreign keys)

| Order | Migration | Tables |
|-------|-----------|--------|
| 001 | Core | `profiles`, `support_links` |
| 002 | Categories | `categories` (with end_of_day_policy enum) |
| 003 | Missions | `missions` (one-time + recurring) |
| 004 | Events | `events` |
| 005 | Completions | `mission_completions`, `event_completions` |
| 006 | Goals | `goals`, `goal_items` |
| 007 | Economy | `economy_state`, `economy_config` |
| 008 | Streaks | `weekly_streak_state`, `badges`, `grace_tokens` |
| 009 | Stickers | `sticker_catalog`, `sticker_ownership`, `sticker_placements` |
| 010 | Mood | `mood_feelings`, `mood_logs` |
| 011 | Bonus | `bonus_objectives`, `bonus_completions` |
| 012 | Admin | `joey_todos`, `mission_proposals` |
| 013 | Health | `health_access_config`, `health_pharmacies`, `health_providers`, `health_medications`, `health_med_intake_logs`, `health_refill_logs` |

### 2.2 Key Constraints
- `support_links`: Max 3 active per Emily (trigger-enforced)
- `mission_completions`: UNIQUE(mission_id, completion_date)
- `joey_todos`: UNIQUE(type, related_id) WHERE status='open'

### 2.3 RLS Policies

**Helper Functions:**
- `auth.user_role()` - Returns 'emily' | 'support' | 'joey'
- `auth.is_joey()` - Boolean check
- `auth.is_support_of(emily_id)` - Checks active support link
- `auth.can_access_health(owner_id, access_type)` - Health permission check

**Policy Patterns:**
- Joey: Full access to all tables
- Emily: Own data only (owner_user_id = auth.uid())
- Support: Read via support link, limited writes
- Mood logs: Joey SELECT only, Emily INSERT only
- Health: Configurable via `health_access_config`

---

## Phase 3: Authentication & Roles

### 3.1 Supabase Auth Setup
- Email/password authentication
- Password reset via email
- Profile auto-creation trigger on signup

### 3.2 Auth Implementation
- `AuthContext` - User state, sign in/out, loading
- `useAuth()` hook - Access auth context
- `usePermissions()` hook - Role-based permission checks
- `ProtectedRoute` component - Route guarding

### 3.3 Permission Matrix

| Action | Emily | Support | Joey |
|--------|-------|---------|------|
| Create one-time mission | Yes | Yes | Yes |
| Create recurring mission | Yes | Propose only | Yes |
| Complete missions | Yes | No | Yes |
| View mood history | No | No | Yes |
| Edit health data | Log intake | Configurable | Yes |
| Approve proposals | No | No | Yes |

---

## Phase 4: Core Features (Build Order)

### 4.1 Foundation (Week 1)
- [ ] Timezone utilities (`lib/timezone.ts`)
  - `getCanonicalNow()`, `getCanonicalToday()`
  - `getWeekBounds()` (Monday-Sunday)
  - `isToday()`, `isSameWeek()`
- [ ] UI component library
  - TouchButton (min 44px), Card, Modal, Input
  - LoadingSpinner, EmptyState
- [ ] Layout components
  - AppLayout with bottom navigation
  - Safe area handling for iPad

### 4.2 Missions (Week 2)
- [ ] Categories CRUD (Joey admin)
- [ ] Mission CRUD service
- [ ] "Add Button" superpower flow
  1. Title input
  2. When picker (Today/Another day/This week/Recurring)
  3. Category selection
  4. Optional: instructions, steps, deadline
- [ ] Mission completion with VP award
- [ ] Lazy rollover on app open

### 4.3 Economy & Gamification (Week 3)
- [ ] Economy state management
- [ ] VP awarding logic
- [ ] Level progression calculation
- [ ] Coin rewards on level-up
- [ ] "Daily Win" threshold check
- [ ] Animations
  - Completion sparkle
  - Level-up confetti
  - Badge pop-in

### 4.4 Home & Mission Log (Week 4)
- [ ] Home dashboard
  - Today status summary
  - VP/Level/Coins display
  - Mood check-in widget
  - Add button
- [ ] Mission Log (Today)
  - Today's tasks section
  - "This Week" floating tray (collapsed, top 3)
  - Bonus objectives
  - Event-tasks
- [ ] Drag-and-drop reordering
- [ ] Snooze functionality
- [ ] "Start next task" focus card

### 4.5 Calendar & Events (Week 5)
- [ ] Event CRUD
- [ ] Week view
- [ ] Month view
- [ ] Event-tasks in Mission Log
- [ ] Event completion
- [ ] Optional/mandatory indicators

### 4.6 Streaks, Badges, Stickers (Week 6)
- [ ] Weekly streak tracking (weekly missions only)
- [ ] Grace token system
- [ ] Badge awarding
- [ ] Sticker catalog management
- [ ] Sticker shop with coin purchase
- [ ] Sticker canvas (drag-and-drop placement on Home)

### 4.7 Goals (Week 7)
- [ ] Destinies (Emily-created)
- [ ] Quests (Support-created)
- [ ] Ordered mission list
- [ ] Attachments/links
- [ ] Completion: all linked missions done at least once

### 4.8 Mood Check-ins (Week 7)
- [ ] Quadrant picker (energy x pleasantness)
- [ ] Feelings picker (1-2 from quadrant)
- [ ] Intensity slider (1-5, optional)
- [ ] 3/day limit + 3-hour cooldown
- [ ] Joey-only history view

### 4.9 Health Log (Week 8)
- [ ] Medications
  - Name, dosage, instructions
  - Pills on hand, low supply threshold
  - Rx numbers, refills remaining
  - Pharmacy, prescriber links
- [ ] Care team (doctors, therapists, groups)
- [ ] Refill risk evaluation (lazy, on app/page open)
- [ ] Joey todos for refill risks
- [ ] Optional intake logging (if enabled)

### 4.10 Admin Features (Week 8)
- [ ] Joey dashboard
- [ ] Proposals inbox (approve/reject)
- [ ] Category management
- [ ] Economy config
- [ ] Sticker catalog management
- [ ] Mood vocabulary management
- [ ] Health access configuration

---

## Phase 5: Polish & Testing

### 5.1 UI/UX Polish
- [ ] Calm color palette throughout
- [ ] Gentle animations (framer-motion)
- [ ] Large touch targets (44px+)
- [ ] Supportive language (no shame words)
- [ ] Responsive tablet-first layout

### 5.2 Testing Strategy

**Unit Tests (Vitest):**
- Timezone utilities
- VP/Level calculations
- Permission checks
- Rollover logic

**Integration Tests:**
- Mission CRUD flows
- Completion flows
- Economy updates

**E2E Tests (Playwright):**
- Critical user flows
- Role-based access
- Tablet viewport

### 5.3 Acceptance Criteria Mapping
- AC-001 to AC-010: Core features
- AC-011 to AC-014: Health log features

---

## Phase 6: Deployment

### 6.1 Netlify Configuration
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 6.2 Environment Variables
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 6.3 Supabase Storage
- `stickers` bucket (public read, Joey write)
- Optional `attachments` bucket

---

## Key Design Decisions

1. **No cron jobs** - Lazy evaluation on app open for rollover and refill checks
2. **Canonical timezone** - America/New_York for all date logic
3. **RLS-first security** - All permissions at database level
4. **Completion-driven** - No occurrence generation table
5. **Touch-first** - All interactive elements 44px minimum
6. **Calm animations** - Short, gentle, non-jarring

---

## Files to Create

### Core Infrastructure
- `src/lib/supabase.ts`
- `src/lib/timezone.ts`
- `src/types/database.ts`
- `src/contexts/AuthContext.tsx`
- `src/hooks/useAuth.ts`
- `src/hooks/usePermissions.ts`

### Services
- `src/services/missions.ts`
- `src/services/events.ts`
- `src/services/economy.ts`
- `src/services/health.ts`
- `src/services/rollover.ts`

### Pages
- `src/pages/Home.tsx`
- `src/pages/Today.tsx`
- `src/pages/Calendar.tsx`
- `src/pages/Health.tsx`
- `src/pages/Goals.tsx`
- `src/pages/Shop.tsx`
- `src/pages/Admin.tsx`

### Database
- `supabase/migrations/001_core.sql` through `013_health.sql`

---

## Verification Plan

1. **Auth Flow**: Sign up, sign in, role assignment, password reset
2. **Mission Flow**: Create via Add button, complete, verify VP awarded
3. **Rollover**: Create past-due mission, reopen app, verify policy applied
4. **Economy**: Complete missions, verify level-up and coin award
5. **Permissions**: Test each role's access to missions, mood, health
6. **Health Alerts**: Set low pill count, verify Joey todo created
7. **Stickers**: Purchase, place on canvas, verify persistence
8. **Mood**: Submit check-in, verify cooldown, verify Joey can view history
