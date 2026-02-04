# Emily's Missions: Comprehensive Rebuild Plan

**Generated:** 2026-02-03
**Schema Version:** 1.3.0
**Status:** Approved for Implementation

---

## 1. Spec Alignment Summary

### 1.1 Application Purpose
A calm, structured life-management application for a **disabled adult user** to:
- Complete daily tasks with gentle gamification (points, levels, coins, streaks)
- Manage medications, refills, and inventory with explainable tracking
- Plan appointments with transition buffers
- Track symptoms and provider discussion items
- Manage a simple budget with restricted accounts (e.g., SNAP)
- Build routines (ADLs) and manage recipes/shopping lists
- Personalize with a Sticker Wall (earned via coins)

### 1.2 User Roles
| Role Key | Canonical | Purpose |
|----------|-----------|---------|
| `admin` | Yes | Configuration, feature toggles, store, audit, security |
| `member` | Yes | Primary application user |
| `support` | Yes | Future expansion (not used for v1 task assignment) |

Role labels are renameable via `RoleLabel`; permissions are enforced via `RolePermission`.

### 1.3 Supported Platforms
- **Web** (left sidebar navigation, split-pane views)
- **iOS** (bottom tab navigation, large tap targets)
- **Android** (bottom tab navigation)
- **macOS** (same as web, keyboard shortcuts)

### 1.4 Core Modules (Toggleable via `FeatureModuleSetting`)
| Module | Description | Default |
|--------|-------------|---------|
| `tasks` | Tasks, recurrence, groups, bonuses | Enabled |
| `goals` | Goals with approval workflow | Enabled |
| `medications` | Prescriptions, schedules, intake, inventory | Enabled |
| `routines` | ADLs/routines templates and logging | Optional |
| `wellbeing` | Symptom entries, provider discussion items | Optional |
| `budget` | Accounts, planned items, transactions | Optional |
| `recipes` | Recipe book and ingredients | Optional |
| `shopping` | Shopping lists with two-phase checkoff | Optional |
| `notifications` | Unified notification system | Enabled |
| `gamification` | Points, levels, streaks | Enabled |
| `store` | Coins, purchases, stickers, tokens | Optional |
| `attachments` | File storage with signed URLs | Optional |
| `audit` | Mutation audit logging | Enabled |
| `security` | Session management, API tokens | Enabled |

### 1.5 Must-Have v1.0 Requirements
1. **Identity & Access:** Workspace boundary, RBAC, RLS on all queries
2. **Tasks:** Create, complete, recurring tasks; points ledger
3. **Events:** Calendar with transition buffers and reminders
4. **Medications:** Prescriptions, schedules, intake logging, inventory tracking
5. **Notifications:** Unified system for all reminders
6. **Gamification:** Points → levels, coins via streaks, store purchases
7. **Audit:** Mutation events and sensitive access events
8. **Explainability:** Every computed value (inventory, points, coins) has drill-down

### 1.6 Non-Goals (Explicit v1 Exclusions)
- No clinical-grade adherence analytics or medical advice
- No device integrations (smart pill bottles, health records)
- No caregiver task assignment workflows
- No multi-workspace switching UI (schema supports it, product does not)

---

## 2. Target Architecture

### 2.1 Platform Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                        Supabase Backend                         │
│  ┌─────────────┬──────────────┬────────────────┬─────────────┐ │
│  │ PostgreSQL  │   Auth       │   Storage      │ Edge Funcs  │ │
│  │ (RLS/RBAC)  │  (Sessions)  │ (Signed URLs)  │ (Optional)  │ │
│  └─────────────┴──────────────┴────────────────┴─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ REST/Realtime
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
┌──────┴──────┐       ┌───────┴───────┐      ┌──────┴──────┐
│   Web App   │       │   iOS/macOS   │      │   Android   │
│  (React/TS) │       │   (SwiftUI)   │      │  (Kotlin)   │
│             │       │               │      │  (Future)   │
└─────────────┘       └───────────────┘      └─────────────┘
```

### 2.2 Frontend Strategy

#### Web Application
- **Framework:** React 18+ with TypeScript
- **Build:** Vite
- **State:** TanStack Query for server state, Zustand for client state
- **Routing:** React Router v6
- **Styling:** CSS Modules with design tokens
- **Auth:** Supabase Auth (email/password for v1)

#### iOS/macOS Application (Primary Native Target)
- **Framework:** SwiftUI (iOS 17+, macOS 14+)
- **Architecture:** MVVM with Repository pattern
- **Data:** Supabase Swift SDK
- **Auth:** Supabase Auth with Keychain storage
- **Navigation:** NavigationStack with TabView
- **Offline:** Read-only cache for Today screen data (SwiftData or UserDefaults)

#### Shared Concerns
- Design tokens synchronized between web (CSS variables) and native (Swift extensions)
- Type definitions generated from `database-spec.json`
- API contract defined by Supabase schema + RLS policies

### 2.3 Native App Architecture (Xcode Project Evolution)

The existing "Emily's Missions" Xcode project will evolve as follows:

```
Emily's Missions/
├── App/
│   └── Emily_s_MissionsApp.swift      # Entry point, DI setup
├── Core/
│   ├── Auth/                           # AuthManager, SessionStore
│   ├── Network/                        # SupabaseClient, APIClient
│   ├── Database/                       # Local cache (optional)
│   └── Extensions/                     # Foundation extensions
├── Design/
│   ├── Tokens/                         # Colors, Typography, Spacing
│   ├── Components/                     # Reusable UI components
│   └── Themes/                         # ThemeManager, AccentColor
├── Features/
│   ├── Today/                          # Today screen + ViewModel
│   ├── Tasks/                          # Task list, completion
│   ├── Calendar/                       # Events, buffers
│   ├── Health/                         # Medications, intake
│   ├── Budget/                         # Accounts, transactions
│   ├── Shopping/                       # Lists, recipes
│   ├── Store/                          # Purchases, stickers
│   ├── StickerWall/                    # Decoration canvas
│   ├── Settings/                       # Preferences, appearance
│   └── Admin/                          # Admin-only screens
├── Models/
│   ├── Generated/                      # Types from database-spec.json
│   └── ViewModels/                     # Feature-specific view models
├── Services/
│   ├── TaskService.swift
│   ├── MedicationService.swift
│   ├── StreakService.swift
│   └── ...
└── Resources/
    ├── Assets.xcassets
    ├── Localizable.strings
    └── Info.plist
```

### 2.4 Backend: Supabase Usage Boundaries

| Supabase Feature | Usage |
|------------------|-------|
| **Auth** | Email/password authentication, session management |
| **Database** | PostgreSQL with RLS for all data access |
| **Storage** | Attachments with signed URLs (never public) |
| **Realtime** | Optional: live updates for Today screen |
| **Edge Functions** | Optional: complex operations (streak evaluation, batch notifications) |

**RLS is mandatory** - no direct table access without workspace_id filtering.

### 2.5 Shared Types Strategy

```
database-spec.json
       │
       ├──[codegen]──► types/database.ts     (Web)
       │
       └──[codegen]──► Models/Generated/     (Swift)
```

A code generator will:
1. Parse `database-spec.json`
2. Generate TypeScript interfaces with enum unions
3. Generate Swift structs/enums with Codable conformance
4. Validate type consistency across platforms

---

## 3. Repository Structure

### 3.1 Proposed Folder Layout

```
EmilyBinder/
├── .github/
│   └── workflows/
│       ├── web-ci.yml
│       ├── ios-ci.yml
│       └── supabase-migrate.yml
├── docs/
│   ├── spec.md                         # Product spec (source of truth)
│   ├── visual-design-spec.md           # Design system spec
│   └── database-spec.json              # Schema spec (source of truth)
├── packages/
│   └── shared/
│       ├── types/                      # Generated TypeScript types
│       └── codegen/                    # Type generation scripts
├── apps/
│   ├── web/                            # React web application
│   │   ├── src/
│   │   ├── public/
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── ios/                            # Xcode project (renamed)
│       └── Emily's Missions/
│           ├── Emily's Missions.xcodeproj
│           └── Emily's Missions/
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 00001_initial_schema.sql
│   │   ├── 00002_rls_policies.sql
│   │   └── ...
│   ├── seed/
│   │   ├── 00_permissions.sql
│   │   ├── 01_feature_modules.sql
│   │   └── 02_level_curve.sql
│   └── functions/                      # Edge functions (if needed)
├── scripts/
│   ├── codegen.ts                      # Type generation
│   ├── validate-schema.ts              # Schema validation
│   └── sync-tokens.ts                  # Design token sync
├── Previous/                           # ARCHIVED - reference only
├── REBUILD-PLAN.md                     # This document
└── README.md
```

### 3.2 Spec Versioning

- Specs live in `docs/` and are versioned in git
- `database-spec.json` includes `schema_version` (currently 1.3.0)
- Breaking changes require version bump and migration plan
- CI validates migrations against spec

### 3.3 Xcode Project Coexistence

- Xcode project remains at `apps/ios/Emily's Missions/`
- Swift Package Manager for dependencies (Supabase SDK)
- Shared design tokens synced via `scripts/sync-tokens.ts`
- Generated types placed in `Emily's Missions/Models/Generated/`

---

## 4. Supabase Rebuild Plan

### 4.1 Overview

The existing Supabase project has old tables/data that must be cleared. This is a **destructive operation**.

```
CURRENT STATE                    TARGET STATE
┌─────────────────┐              ┌─────────────────┐
│ Old Schema      │              │ New Schema      │
│ (Previous/)     │    ════►     │ (database-spec) │
│ Untrusted data  │              │ Clean seed      │
└─────────────────┘              └─────────────────┘
```

### 4.2 Step-by-Step Rebuild

#### Step 1: Backup (Optional, Explicit)

If any data should be preserved (unlikely for rebuild):

```bash
# Export specific tables if needed (probably not)
supabase db dump --data-only > backup_$(date +%Y%m%d).sql
```

**Decision:** For a clean rebuild, skip this. Old data is untrusted.

#### Step 2: Schema Teardown

**WARNING: IRREVERSIBLE**

```sql
-- Connect to Supabase SQL editor
-- Drop all existing tables (cascade to drop dependencies)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;
```

#### Step 3: Migration Generation Strategy

Migrations will be generated from `database-spec.json` in this order:

| Migration | Content |
|-----------|---------|
| `00001_enums.sql` | All enum types |
| `00002_core_identity.sql` | Workspace, User, PatientProfile |
| `00003_rbac.sql` | Permission, RolePermission, RoleLabel |
| `00004_feature_modules.sql` | FeatureModule, FeatureModuleSetting |
| `00005_gamification_base.sql` | PointsSystem, CurrencyLabel, LevelSystem, LevelCurve |
| `00006_tasks.sql` | Task, TaskInstance, RecurrenceRule, TaskGroup, etc. |
| `00007_goals.sql` | Goal, GoalTaskLink, GoalTypeLabel |
| `00008_events.sql` | Event, TransitionBuffer |
| `00009_medications.sql` | Medication, Prescription, MedicationSchedule, etc. |
| `00010_health.sql` | Routine, SymptomEntry, ProviderDiscussionItem |
| `00011_budget.sql` | BudgetAccount, BudgetCategory, BudgetPlanItem, BudgetTransaction |
| `00012_recipes_shopping.sql` | Recipe, ShoppingList, FavoriteItem |
| `00013_notifications.sql` | Notification |
| `00014_attachments.sql` | Attachment, ShareLink |
| `00015_store.sql` | StoreItem, Purchase, Redemption, UserInventory |
| `00016_stickers.sql` | Sticker, HomeDecoration |
| `00017_streaks.sql` | StreakDefinition, StreakState, StreakShieldUse |
| `00018_ledgers.sql` | PointsLedgerEntry, CoinLedgerEntry, CoinWallet, UserProgress |
| `00019_audit.sql` | AuditEvent, SensitiveAccessEvent |
| `00020_security.sql` | AuthSession, ApiToken |
| `00021_indexes.sql` | Performance indexes |
| `00022_rls_policies.sql` | Row Level Security policies |
| `00023_audit_triggers.sql` | Automatic audit logging triggers |

#### Step 4: RLS Policy Implementation

Every table with `workspace_id` gets workspace-scoped RLS:

```sql
-- Example: Task table RLS
ALTER TABLE task ENABLE ROW LEVEL SECURITY;

-- Admin can see all tasks in workspace
CREATE POLICY "admin_all_tasks" ON task
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid()
      AND role_key = 'admin'
      AND status = 'active'
    )
  );

-- Member can see their assigned tasks
CREATE POLICY "member_own_tasks" ON task
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
    AND (
      assigned_to_user_id = auth.uid()
      OR created_by_user_id = auth.uid()
    )
  );
```

**Key RLS Patterns:**
1. Always filter by `workspace_id`
2. Patient-owned tables also filter by `patient_id` or assignment
3. Use `workspace_membership` junction for role checks
4. Sensitive tables (medications, budget) require explicit permission checks

#### Step 5: Audit Implementation

**AuditEvent Trigger (Mutations):**

```sql
CREATE OR REPLACE FUNCTION audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_event (
    audit_event_id,
    workspace_id,
    actor_user_id,
    object_type,
    object_id,
    action,
    occurred_at,
    field_changes
  ) VALUES (
    gen_random_uuid(),
    COALESCE(NEW.workspace_id, OLD.workspace_id),
    auth.uid(),
    TG_TABLE_NAME,
    COALESCE(NEW.task_id, OLD.task_id), -- adjust per table
    CASE TG_OP
      WHEN 'INSERT' THEN 'create'
      WHEN 'UPDATE' THEN 'update'
      WHEN 'DELETE' THEN 'delete'
    END,
    now(),
    CASE TG_OP
      WHEN 'UPDATE' THEN jsonb_build_object(
        'old', to_jsonb(OLD),
        'new', to_jsonb(NEW)
      )
      ELSE NULL
    END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to each audited table
CREATE TRIGGER task_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON task
  FOR EACH ROW EXECUTE FUNCTION audit_mutation();
```

**SensitiveAccessEvent (Read Logging):**

Sensitive access logging is handled at the application layer, not database triggers. The app logs when users:
- View prescription details
- Download attachments
- View budget information
- Export data

#### Step 6: Seed Data

Required seed data for app bootstrap:

```sql
-- 00_permissions.sql
INSERT INTO permission (permission_id, key, description, created_at)
VALUES
  (gen_random_uuid(), 'view_all', 'View all data in workspace', now()),
  (gen_random_uuid(), 'manage_users', 'Manage user accounts', now()),
  (gen_random_uuid(), 'manage_feature_toggles', 'Toggle feature modules', now()),
  (gen_random_uuid(), 'manage_tasks', 'Create/edit tasks', now()),
  (gen_random_uuid(), 'manage_goals', 'Manage goals', now()),
  (gen_random_uuid(), 'manage_medications', 'Manage medications', now()),
  (gen_random_uuid(), 'manage_budget', 'Manage budget', now()),
  (gen_random_uuid(), 'manage_recipes', 'Manage recipes', now()),
  (gen_random_uuid(), 'manage_store', 'Manage store items', now()),
  (gen_random_uuid(), 'manage_gamification', 'Configure gamification', now()),
  (gen_random_uuid(), 'view_sensitive_health', 'View health details', now()),
  (gen_random_uuid(), 'view_sensitive_budget', 'View budget details', now()),
  (gen_random_uuid(), 'view_audit', 'View audit logs', now()),
  (gen_random_uuid(), 'export_data', 'Export data', now()),
  (gen_random_uuid(), 'manage_security', 'Manage sessions/tokens', now());

-- 01_feature_modules.sql
INSERT INTO feature_module (feature_module_id, key, default_enabled, depends_on_module_keys, created_at)
VALUES
  (gen_random_uuid(), 'tasks', true, NULL, now()),
  (gen_random_uuid(), 'goals', true, ARRAY['tasks'], now()),
  (gen_random_uuid(), 'medications', true, NULL, now()),
  (gen_random_uuid(), 'routines', false, NULL, now()),
  (gen_random_uuid(), 'wellbeing', false, NULL, now()),
  (gen_random_uuid(), 'budget', false, NULL, now()),
  (gen_random_uuid(), 'recipes', false, NULL, now()),
  (gen_random_uuid(), 'shopping', false, ARRAY['recipes'], now()),
  (gen_random_uuid(), 'notifications', true, NULL, now()),
  (gen_random_uuid(), 'gamification', true, ARRAY['tasks'], now()),
  (gen_random_uuid(), 'store', false, ARRAY['gamification'], now()),
  (gen_random_uuid(), 'attachments', false, NULL, now()),
  (gen_random_uuid(), 'audit', true, NULL, now()),
  (gen_random_uuid(), 'security', true, NULL, now());

-- 02_level_curve.sql (default curve)
INSERT INTO level_curve (curve_id, name, mode, created_at)
VALUES ('11111111-1111-1111-1111-111111111111', 'Default', 'explicit_table', now());

INSERT INTO level_curve_step (curve_id, level, required_cumulative_points)
VALUES
  ('11111111-1111-1111-1111-111111111111', 1, 0),
  ('11111111-1111-1111-1111-111111111111', 2, 100),
  ('11111111-1111-1111-1111-111111111111', 3, 250),
  ('11111111-1111-1111-1111-111111111111', 4, 500),
  ('11111111-1111-1111-1111-111111111111', 5, 850),
  ('11111111-1111-1111-1111-111111111111', 6, 1300),
  ('11111111-1111-1111-1111-111111111111', 7, 1900),
  ('11111111-1111-1111-1111-111111111111', 8, 2650),
  ('11111111-1111-1111-1111-111111111111', 9, 3550),
  ('11111111-1111-1111-1111-111111111111', 10, 4600);
```

### 4.3 Irreversible Operations Warning

| Operation | Reversibility | Mitigation |
|-----------|---------------|------------|
| `DROP SCHEMA public CASCADE` | **IRREVERSIBLE** | Backup first if any data matters |
| `DELETE FROM` any table | Reversible with backup | Point-in-time recovery window |
| Running migrations | Forward-only | Test in staging first |
| RLS policy changes | Reversible | Document previous state |

**Recommendation:** Test full rebuild flow on a staging Supabase project before production.

---

## 5. Milestones & Implementation Plan

### Milestone 0: Foundations (Week 1-2)

**Objective:** Auth, workspace, RBAC, audit infrastructure working end-to-end.

**Deliverables:**
- [ ] Supabase schema reset and migrations 00001-00005
- [ ] RLS policies for core identity tables
- [ ] Audit trigger infrastructure
- [ ] Web: Auth flow (login/logout/session)
- [ ] iOS: Auth flow with Keychain
- [ ] Seed data for permissions and feature modules

**API/Data Dependencies:**
- Workspace, User, PatientProfile, WorkspaceMembership
- Permission, RolePermission
- FeatureModule, FeatureModuleSetting

**UI Screens:**
- Web: Login page, basic layout shell
- iOS: Login view, main TabView shell

**Acceptance Criteria:**
- [ ] User can sign up and log in (web + iOS)
- [ ] Session persists across app restarts
- [ ] RLS prevents cross-workspace access (test with 2 workspaces)
- [ ] Audit events created for user registration

---

### Milestone 1: Tasks + Today Screen (Week 3-4)

**Objective:** Core task management with points ledger.

**Deliverables:**
- [ ] Migrations 00006 (tasks)
- [ ] Task CRUD with RLS
- [ ] Points ledger entries on completion
- [ ] Today screen showing daily tasks
- [ ] Task completion with undo
- [ ] Basic points display

**API/Data Dependencies:**
- Task, TaskInstance, TaskTag, RecurrenceRule
- PointsLedgerEntry, UserProgress

**UI Screens:**
- Today screen (task list, completion)
- Task detail/edit modal
- Points indicator in header

**Acceptance Criteria:**
- [ ] Member can view tasks assigned for today
- [ ] Member can mark tasks complete (updates status + creates ledger entry)
- [ ] Points display updates after completion
- [ ] Admin can create/edit tasks
- [ ] Recurring tasks generate instances

---

### Milestone 2: Events + Calendar (Week 5-6)

**Objective:** Calendar events with transition buffers.

**Deliverables:**
- [ ] Migrations 00008 (events)
- [ ] Event CRUD with RLS
- [ ] Transition buffer creation
- [ ] Calendar view (month/week/day)
- [ ] Event detail with buffer visualization

**API/Data Dependencies:**
- Event, TransitionBuffer

**UI Screens:**
- Calendar view
- Add/Edit event modal
- Event detail with buffer display

**Acceptance Criteria:**
- [ ] Member can view calendar
- [ ] Events display with buffers visually marked
- [ ] Admin can create events with buffers
- [ ] Events link to tasks (prep tasks)

---

### Milestone 3: Notifications (Week 7)

**Objective:** Unified notification system.

**Deliverables:**
- [ ] Migrations 00013 (notifications)
- [ ] Notification CRUD and RLS
- [ ] iOS push notification setup (APNs)
- [ ] In-app notification list UI (web + iOS)
- [ ] Snooze/dismiss functionality

**API/Data Dependencies:**
- Notification

**UI Screens:**
- Notification center/list
- Notification settings

**Acceptance Criteria:**
- [ ] Notifications created for events/tasks
- [ ] Push notifications delivered (iOS only for v1)
- [ ] In-app notification list works on web (no web push)
- [ ] User can snooze/dismiss
- [ ] Notification links to source (event/task)

---

### Milestone 4: Medications + Inventory (Week 8-10)

**Objective:** Full medication management with explainable inventory.

**Deliverables:**
- [ ] Migrations 00009 (medications)
- [ ] Medication, Prescription, MedicationSchedule CRUD
- [ ] Intake event logging
- [ ] Inventory tracking with adjustments
- [ ] Dose reminder notifications
- [ ] Refill/renewal workflow

**API/Data Dependencies:**
- Medication, Prescription, MedicationSchedule
- Dispense, Inventory, InventoryAdjustment
- IntakeEvent
- Provider, Pharmacy
- RenewalPlan, RenewalPlanStep, RenewalAttempt

**UI Screens:**
- Medication list
- Prescription detail (schedule, inventory)
- Intake log button
- Inventory drill-down (explainability)
- Refill workflow

**Acceptance Criteria:**
- [ ] Member can view prescriptions and schedules
- [ ] Member can log intake (taken/skipped/missed)
- [ ] Inventory updates after intake
- [ ] Inventory drill-down shows dispenses - intakes + adjustments
- [ ] Low stock notifications generated
- [ ] Sensitive access logged for medication views

---

### Milestone 5: Health (Wellbeing + Routines) (Week 11)

**Objective:** Symptom logging and routines.

**Deliverables:**
- [ ] Migrations 00010 (health)
- [ ] Routine templates and event logging
- [ ] Symptom entry logging
- [ ] Provider discussion items
- [ ] Link symptoms to prescriptions/providers

**API/Data Dependencies:**
- Routine, RoutineEvent
- SymptomEntry
- ProviderDiscussionItem

**UI Screens:**
- Routines list + log
- Symptom log entry
- Provider discussion items list

**Acceptance Criteria:**
- [ ] Member can log routine completion
- [ ] Member can log symptoms with severity
- [ ] Member can create discussion items for provider visits
- [ ] Discussion items link to symptoms/prescriptions

---

### Milestone 6: Budget (Week 12)

**Objective:** Simple budget tracking with restricted accounts.

**Deliverables:**
- [ ] Migrations 00011 (budget)
- [ ] Budget accounts with restrictions
- [ ] Planned items and actual transactions
- [ ] Budget summary views

**API/Data Dependencies:**
- BudgetAccount, BudgetCategory
- BudgetPlanItem, BudgetTransaction

**UI Screens:**
- Budget overview
- Account detail
- Add transaction
- Planned vs actual comparison

**Acceptance Criteria:**
- [ ] Member can view account balances
- [ ] Member can log transactions
- [ ] Restricted accounts enforce category rules
- [ ] Planned vs actual summary displays correctly
- [ ] Sensitive access logged for budget views

---

### Milestone 7: Recipes + Shopping (Week 13)

**Objective:** Recipe book and shopping list generation.

**Deliverables:**
- [ ] Migrations 00012 (recipes, shopping)
- [ ] Recipe CRUD with ingredients
- [ ] Favorite items (staples)
- [ ] Shopping list generation from recipes
- [ ] Two-phase checkoff (home check, store buy)

**API/Data Dependencies:**
- Recipe, RecipeIngredient
- FavoriteItem
- ShoppingList, ShoppingListItem

**UI Screens:**
- Recipe list + detail
- Add/edit recipe
- Shopping list with two-phase UI
- Favorites management

**Acceptance Criteria:**
- [ ] Member can browse recipes
- [ ] Member can generate shopping list from recipes + favorites
- [ ] Shopping list supports "check at home" then "buy in store"
- [ ] Large checkboxes for store mode

---

### Milestone 8: Gamification (Streaks + Coins + Store) (Week 14-15)

**Objective:** Full gamification loop with store and stickers.

**Deliverables:**
- [ ] Migrations 00015-00018 (store, stickers, streaks, ledgers)
- [ ] Streak definitions and evaluation
- [ ] Coin ledger and wallet
- [ ] Store catalog
- [ ] Purchase flow
- [ ] Grace token shielding

**API/Data Dependencies:**
- StreakDefinition, StreakState, StreakShieldUse
- CoinLedgerEntry, CoinWallet
- StoreItem, Purchase, Redemption, UserInventory
- Sticker, HomeDecoration

**UI Screens:**
- Streak chips on Today screen
- Coin balance display
- Store catalog
- Purchase confirmation
- Inventory view

**Acceptance Criteria:**
- [ ] Streaks evaluate at period end
- [ ] Coins awarded for streak completion/milestones
- [ ] Member can browse and purchase store items
- [ ] Coin ledger updates on purchase
- [ ] Grace tokens can shield streak breaks
- [ ] Streak shielding is explainable (StreakShieldUse record)

---

### Milestone 9: Sticker Wall (Week 16)

**Objective:** Dedicated decoration space.

**Deliverables:**
- [ ] Sticker Wall canvas UI
- [ ] Drag/drop/scale sticker placement
- [ ] Edit mode toggle
- [ ] Undo/reset functionality
- [ ] View mode (no accidental edits)

**API/Data Dependencies:**
- HomeDecoration (position, rotation, scale, z_index)
- UserInventory (owned stickers)

**UI Screens:**
- Sticker Wall (full-screen canvas)
- Edit mode toolbar
- Sticker tray (owned items)

**Acceptance Criteria:**
- [ ] Member can place owned stickers on wall
- [ ] Stickers do not overlap functional UI
- [ ] Edit mode required for changes
- [ ] View mode shows placements without handles
- [ ] Undo available during editing

---

### Milestone 10: Admin Panel + Security (Week 17)

**Objective:** Admin controls and security management.

**Deliverables:**
- [ ] Admin-only screens with permission gates
- [ ] Feature toggle management
- [ ] Store item management
- [ ] Streak definition management
- [ ] Role label customization
- [ ] Audit log viewer
- [ ] Session/token management (if enabled)

**API/Data Dependencies:**
- All admin-configurable tables
- AuditEvent, SensitiveAccessEvent
- AuthSession, ApiToken

**UI Screens:**
- Admin dashboard
- Feature toggles
- Store management
- Streak configuration
- Audit log viewer
- Active sessions list

**Acceptance Criteria:**
- [ ] Admin can toggle feature modules
- [ ] Admin can configure store items
- [ ] Admin can define/edit streaks
- [ ] Admin can view audit logs with filtering
- [ ] Admin can revoke sessions
- [ ] Non-admin users cannot access admin screens

---

### Milestone 11: Polish + Performance (Week 18)

**Objective:** Production readiness.

**Deliverables:**
- [ ] Performance optimization (indexes verified)
- [ ] Cache invalidation testing
- [ ] Error handling improvements
- [ ] Accessibility audit
- [ ] Reduced motion implementation
- [ ] High contrast mode testing

**Acceptance Criteria:**
- [ ] Page load < 2s on 3G
- [ ] No accessibility violations (WCAG AA)
- [ ] Reduced motion respects system setting
- [ ] Error states are clear and recoverable

---

## 6. Testing & QA Strategy

### 6.1 Unit Tests

**Coverage Targets:**
- Services: 80%+ coverage
- Utilities/helpers: 90%+ coverage
- View models: 70%+ coverage

**Web Stack:**
- Vitest for unit tests
- Testing Library for component tests

**iOS Stack:**
- XCTest for unit tests
- Quick/Nimble for BDD-style tests (optional)

### 6.2 Integration Tests

**Database Integration:**
- Test RLS policies with multiple user roles
- Test ledger consistency (points sum = UserProgress.total_points)
- Test inventory reconciliation

**API Integration:**
- Test CRUD operations with real Supabase (staging)
- Test permission denials return proper errors

### 6.3 E2E Tests

**Web:**
- Playwright for browser automation
- Critical flows: login, task completion, medication intake, purchase

**iOS:**
- XCUITest for UI automation
- Critical flows: login, task completion, medication intake

### 6.4 Security Tests

```
RLS Policy Tests
├── Cross-workspace isolation
│   ├── User A cannot see User B's workspace data
│   └── User cannot access workspace they're not member of
├── Role-based access
│   ├── Member cannot access admin-only operations
│   └── Admin can see all workspace data
└── Sensitive data access
    ├── Medication views logged to SensitiveAccessEvent
    └── Budget views logged to SensitiveAccessEvent

Permission Tests
├── Each PermissionKey is enforced
├── RolePermission overrides work per workspace
└── Feature toggle hides UI AND blocks API
```

### 6.5 Data Integrity Tests

```
Ledger Reconciliation
├── SUM(PointsLedgerEntry.delta) = UserProgress.total_points
├── SUM(CoinLedgerEntry.delta) = CoinWallet.balance
└── Inventory = dispenses - intakes + adjustments

Audit Completeness
├── Every create operation has AuditEvent(action='create')
├── Every update operation has AuditEvent(action='update')
└── Every delete operation has AuditEvent(action='delete')
```

---

## 7. Risks & Mitigations

### 7.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| RLS policy bugs expose data | Critical | Medium | Automated RLS tests, security audit before launch |
| Ledger inconsistency | High | Low | Reconciliation checks, immutable ledger design |
| Performance issues at scale | Medium | Medium | Index optimization, pagination, caching strategy |
| Supabase service outage | High | Low | Offline mode for critical data (iOS cache) |

### 7.2 Product Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Feature creep delays v1 | High | High | Strict adherence to spec non-goals |
| Cognitive overload in UI | High | Medium | User testing, design review against spec |
| Gamification feels punitive | Medium | Medium | Focus on positive feedback, no visible penalties |

### 7.3 Process Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Schema changes during build | High | Medium | Lock spec before milestone starts |
| Type drift between platforms | Medium | Medium | Automated codegen from single source |
| Incomplete audit coverage | High | Low | Audit trigger template for all tables |

---

## 8. Open Questions

### 8.1 Resolved Decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | **Push notification provider for web?** | **No web push for v1** | Defer to v1.1; rely on in-app notifications only |
| 2 | **Android timeline?** | **Defer to v1.1** | Focus on iOS + Web for v1, add Android after launch |
| 3 | **Offline support scope?** | **iOS read-only cache** | Cache Today screen data for offline viewing, sync when online; no web offline |

### 8.2 Non-Blocking Questions (Sensible Defaults Applied)

| # | Question | Default Applied |
|---|----------|-----------------|
| 1 | Level cap for v1? | 10 levels (can extend later) |
| 2 | Grace token purchase limit? | 3 per month per streak |
| 3 | Audit retention period? | 1 year (can configure later) |
| 4 | Attachment size limit? | 10MB per file |
| 5 | Max active streaks? | 5 (soft cap, UI warning at 3) |

---

## 9. Appendix: Previous Code Reference Notes

The `Previous/` folder contains a React/Vite web application that was built before this spec was finalized. Key observations:

### What May Be Salvaged (With Caution)
- **Component patterns:** Some UI component structures may inform the rebuild
- **Supabase integration patterns:** Auth flow, query patterns
- **CSS module approach:** Design token structure

### What Should NOT Be Carried Forward
- **Database schema:** Previous migrations do not match `database-spec.json`
- **Architecture:** Services/hooks structure was ad-hoc
- **Security model:** RLS policies were incomplete
- **Audit system:** Was missing or partial

### Explicit Rule
Any code reuse from `Previous/` must:
1. Be explicitly justified against the new spec
2. Pass security review for RLS/RBAC compliance
3. Be rewritten to match new architecture patterns

---

## 10. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-03 | Claude Code | Initial comprehensive rebuild plan |

---

**End of Document**
