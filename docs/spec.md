# Product Spec (v1.0) — Life Planner + Health + Budget + Gamification (Single Workspace)

This document describes the **entire software application** at a product + engineering level. It is intended to be used alongside:
- **Visual Design Spec (v1.0)** — theming, motion, stickers, Sticker Wall, accessibility, and cross-platform UI rules.
- **Database Schema JSON (v1.3.0)** — all tables/objects/enums, constraints, and security/audit invariants.

This spec focuses on **scope, workflows, module boundaries, security posture, and how the UI should map to the schema**.

---

## 1. Purpose and Users

### 1.1 Purpose
A calm, structured, and engaging life-management application for a **disabled adult user** to:
- complete day-to-day tasks
- take medications reliably and track refills
- plan appointments and events with transition buffers
- track wellbeing and issues to discuss with providers
- manage a simple budget with restricted accounts (e.g., SNAP)
- build routines (ADLs)
- use recipes and generate shopping lists
- stay motivated through gentle gamification (points → levels, coins, streaks, stickers, optional real-world rewards)

### 1.2 Primary user roles (renameable labels)
The system uses canonical role keys (stable), with renameable display labels:
- `admin` — manages configuration, feature toggles, streak definitions, store items, audit/security
- `member` — primary user of the application
- `support` — future expansion; present in permissions model but **not used for caregiver task assignment in v1**

**Important:** Labels are customizable per workspace/policy, but permissions are governed by RBAC (RolePermission).

### 1.3 Supported platforms
- Web
- iOS
- Android
- macOS

UI structure should remain consistent across platforms; web/macOS can use denser layouts and split panes.

---

## 2. Product Principles (v1.0)

1. **Low cognitive load:** few choices per screen, predictable patterns, limited “advanced” controls.
2. **Explainability:** any computed number (inventory, points/level, coins, streaks) must have an audit/ledger drill-down.
3. **Security-first:** workspace boundary, strict RBAC, RLS, mutation audits, and sensitive-read audits.
4. **Configurable but safe:** admin can enable/disable major modules and restrict appearance/customization.
5. **No clinical claims:** this is not clinical-grade; it supports reminders, logging, and refill planning.

---

## 3. Scope Summary (Modules)

Each major module is **toggleable** via `FeatureModuleSetting` (admin-controlled), with dependency safety.

### 3.1 Core Planning
- **Tasks** (one-time, recurring, bonus)
- **Task groups** (bonus points if N tasks completed in a day)
- **Calendar events** (appointments + social events)
- **Transition buffers** (before/after events)

### 3.2 Health
- Medications (product concept)
- Prescriptions (instructions, refills, providers/pharmacies)
- Medication schedules (reminders + consumption expectations)
- Dispense history + inventory + adjustments
- Intake events (taken/skipped/missed)
- Renewal plans + scripts + attempts
- Routines / ADLs (templates + log)
- Wellbeing/symptoms log
- Provider discussion items (to bring to an appointment)

### 3.3 Money
- Budget accounts (with restrictions)
- Planned items (recurring/one-time)
- Actual transactions
- Simple computed summaries (planned vs actual, remaining)

### 3.4 Food & Shopping
- Recipe book + ingredients
- Favorite items (staples)
- Shopping lists with two-phase checkoff:
  - check at home
  - buy in store

### 3.5 Notifications
- Unified notification system for:
  - dose reminders, missed dose, low stock, refill due, expiration warnings
  - event reminders and transition buffer reminders
  - general info/custom notifications

### 3.6 Gamification & Store
- Points → levels (level curve)
- Coins (ledger-based)
- Streaks (admin-defined templates + filters)
- Store items (stickers, decorations, consumable tokens, optional real-world rewards)
- Sticker Wall (dedicated decorating space)
- Grace tokens (renameable) purchasable with coins and usable to shield streak breaks

### 3.7 Security & Audit
- RBAC with explicit permissions
- Workspace boundary for future multi-client
- Audit events for mutations
- Sensitive access events for viewing/downloading sensitive content
- Attachments with secure storage references (signed URLs, integrity hashes)

---

## 4. Data Model Mapping (How the UI uses the schema)

This section describes how major screens/features map to core objects. See the JSON schema for exact fields.

### 4.1 Identity & Access
- `Workspace`, `WorkspaceMembership`
- `User`, `PatientProfile`
- `Permission`, `RolePermission`
- `RoleLabel` (renameable role names)

**Rules:**
- All patient-owned records include `workspace_id` and typically `patient_id`.
- All access enforced via RLS + RBAC checks.
- Admin can revoke sessions (`AuthSession`) and integration tokens (`ApiToken`) if enabled.

### 4.2 Tasks & Planning
- `Task` is the template; `TaskInstance` is the dated instance that earns points.
- Recurrence creates instances via `RecurrenceRule`.
- Bonus tasks have caps via `BonusAvailabilitySetting`.
- Group bonuses evaluate daily via `TaskGroupDailyResult`.

**Scoring:**
- Completing a task writes a `PointsLedgerEntry` (authoritative).
- `TaskInstance.points_awarded` is a historical snapshot; the ledger is the source of truth.

### 4.3 Events & Transition Buffers
- Calendar items are `Event` (appointments + social events).
- Buffers are `TransitionBuffer`, applied manually or via rules; reminders become `Notification`s.
- Tasks can link to events via `Task.source_link_type='event'` + `source_link_id=event_id`.

### 4.4 Medications, Refills, and Inventory
- `Medication` is the drug concept.
- `Prescription` is what the user actually follows (SIG, start/stop, refills, prescriber, pharmacy).
- `MedicationSchedule` produces reminders and expected consumption.
- `Dispense` logs fills (quantity, days supply, refills remaining after).
- `Inventory` stores current on-hand and confidence.
- `InventoryAdjustment` captures corrections and dose changes.
- `IntakeEvent` is the event stream of what happened.

**Refill planning:**
- Low stock/refill due produces `Notification` records.
- Renewal scripts/checklists live in `RenewalPlan`, `RenewalPlanStep`.
- Contact attempts are logged in `RenewalAttempt`.

### 4.5 Routines, Wellbeing, Provider Discussion
- `Routine` and `RoutineEvent` handle ADLs/routines.
- `SymptomEntry` logs wellbeing.
- `ProviderDiscussionItem` collects “talk to provider about X” items and links to symptoms/prescriptions.

### 4.6 Budget
- `BudgetAccount` supports restrictions (category allow/block lists, etc.).
- `BudgetPlanItem` for planned items.
- `BudgetTransaction` for actuals.

### 4.7 Recipes & Shopping
- `Recipe` and `RecipeIngredient`
- `FavoriteItem`
- `ShoppingList` and `ShoppingListItem` with two-phase checkoff statuses

### 4.8 Notifications
- Everything funnels through `Notification` (no separate alert table).
- Notifications may link to prescriptions/events/tasks/etc. via `link_type/link_id`.

### 4.9 Gamification (Levels, Coins, Store, Streaks)
- Points are ledgered: `PointsLedgerEntry`
- Levels come from `LevelSystem`, `LevelCurve`, `LevelCurveStep` + cached `UserProgress`
- Coins are ledgered: `CoinLedgerEntry` + cached `CoinWallet`
- Store: `StoreItem`, `Purchase`, `Redemption`, `UserInventory`
- Decorations: `Sticker`, `HomeDecoration`
- Streaks: `StreakDefinition`, `StreakState`, `StreakShieldUse`

---

## 5. Key User Workflows (End-to-End)

### 5.1 Daily “Today” flow (member)
1. User opens **Today**.
2. Sees “Do Now” list: tasks, meds, reminders.
3. Completes tasks:
   - marks done → `TaskInstance` updated
   - system writes `PointsLedgerEntry`
   - streaks evaluated for the period (`StreakState` updates)
   - if streak milestone or period completion triggers coins → `CoinLedgerEntry`
4. User sees gentle feedback (points/coins) and can Undo briefly.

### 5.2 Medication dose + adherence flow
1. Dose reminder arrives (notification).
2. User taps → prescription detail → marks taken.
3. App creates `IntakeEvent` and updates explainable inventory:
   - computed vs manual adjustments preserved
4. Missed doses can trigger notifications, but v1 avoids punitive UX.

### 5.3 Refill / renewal flow
1. System detects low stock or refill due (based on inventory + schedule + last dispense).
2. Creates a `Notification` and/or a linked `Task` (“Contact pharmacy for refill…”).
3. User/admin follows `RenewalPlan` script steps.
4. Each attempt is logged in `RenewalAttempt` for accountability.
5. When filled, `Dispense` is recorded and inventory resets/updates.

### 5.4 Appointment + transition buffers
1. Admin/member creates `Event` (appointment/social).
2. Buffer rules suggest a `TransitionBuffer`.
3. Buffer generates reminders and optionally prep tasks.
4. In calendar, the user sees the buffer visually around the event.

### 5.5 Budget tracking (simple, low-friction)
1. Member adds planned items (rent, groceries) in `BudgetPlanItem`.
2. Member logs actual transactions in `BudgetTransaction`.
3. Money screen shows:
   - planned vs actual
   - remaining per account (especially restricted accounts)
4. Admin can restrict accounts to allowed categories/merchants.

### 5.6 Recipes → shopping list
1. Member picks recipes and staple favorites.
2. App creates `ShoppingList` and items.
3. At home:
   - check items as “already have” vs “need to buy”
4. In store:
   - list shows only “need to buy”, big checkboxes.

### 5.7 Stickers & Sticker Wall
1. User earns coins via streaks.
2. Buys stickers in store (`Purchase`, updates `CoinLedgerEntry`, increments `UserInventory`).
3. Places stickers on the **Sticker Wall** (`HomeDecoration` placements).
4. Wall is separated from functional screens to preserve clarity.

### 5.8 Streak shielding with grace tokens
1. Streak would break (period requirement not met).
2. If streak break behavior allows shielding:
   - system prompts or auto-uses token
3. Token consumption:
   - decrement `UserInventory`
   - create `StreakShieldUse`
   - update `StreakState` as shielded (explainable)

---

## 6. Feature Toggle Behavior (v1.0)

Feature modules can be enabled/disabled per patient via `FeatureModuleSetting`.

### 6.1 Toggle rules
- Disabling a module hides it in the UI and stops scheduled jobs that produce notifications.
- Data remains stored (soft-off), unless an explicit archival feature is added later.
- Enabling/disabling respects dependencies (e.g., shopping depends on recipes).

### 6.2 Suggested default enabled set (v1.0)
- tasks, notifications, gamification (minimal), events/calendar, medications (if applicable)
Optional by preference:
- budget, recipes, shopping, wellbeing, routines, store, decorations

---

## 7. Security and Privacy (Emphasis)

### 7.1 Core security boundary
- **Workspace** is the primary container for RLS and future multi-client.
- All patient-owned tables include `workspace_id`; most include `patient_id`.

### 7.2 RBAC
- Authorization is explicit via `RolePermission` entries.
- Avoid hardcoding role behavior; treat role keys as inputs to permission resolution.
- Admin can view audit/security modules; member sees only what’s allowed by policy.

### 7.3 Audit model
Two distinct audit streams:
1. `AuditEvent` — mutations only (create/update/delete/export/restore)
2. `SensitiveAccessEvent` — reads for sensitive objects (view/download/print/share link)

This separation prevents noisy audit logs and supports real security review.

### 7.4 Attachments security
- Store non-secret object references (`object_key`) only.
- Generate signed URLs on demand.
- Record sensitive access on view/download/share.
- Store file hash (`content_sha256`) to detect corruption/tampering.

### 7.5 Data minimization
- Only collect fields needed for reminders and planning.
- Avoid unnecessary medical detail (no clinical interpretations).
- Optional privacy mode reduces sensitive detail exposure on shared screens.

---

## 8. Visual/UX Requirements (How to use the Visual Design Spec)

The Visual Design Spec defines:
- theming and safe customization
- motion rules and reduced-motion behavior
- semantic color rules (accent ≠ meaning)
- the Sticker Wall experience
- high-contrast and accessibility support
- sensitive-content visual treatment

Engineering should implement the design system as:
- token-based colors/spacing typography
- preset themes and accent palettes
- accessible defaults with admin policy constraints

---

## 9. Non-Goals (Explicit v1 exclusions)

- No clinical-grade adherence analytics or medical advice.
- No device integrations (smart pill bottles, health records) in v1 unless explicitly added.
- No caregiver task assignment workflows (support role exists, but caregiver task routing is deferred).
- No multi-workspace switching UI (schema supports it, product does not yet).

---

## 10. Operational Considerations (v1.0 readiness)

### 10.1 Background jobs / schedulers
- Generate medication dose reminders from `MedicationSchedule`
- Generate refill due notifications from inventory + schedule + last dispense
- Generate event reminders + transition buffer reminders
- Evaluate streak period satisfaction and award coins
- Recompute cached balances:
  - `UserProgress` from `PointsLedgerEntry`
  - `CoinWallet` from `CoinLedgerEntry`

### 10.2 Explainability UX (required)
Any computed value must have a drill-down that shows the underlying events:
- Inventory: dispenses – intake + adjustments
- Coins: `CoinLedgerEntry`
- Points/level: `PointsLedgerEntry` + curve
- Streak shielding: `StreakShieldUse` record

### 10.3 Performance
- Use cached aggregates for home screens, but keep ledgers authoritative.
- Use pagination for audit logs and history views.

---

## 11. Definition of Done (v1.0 baseline)

A v1.0 release is acceptable when:

- Member can:
  - view Today, complete tasks, see points/levels
  - manage calendar events with buffers and reminders
  - manage prescriptions, intake logs, refills, inventory, and renewal plans
  - log symptoms and discussion items
  - track simple budget + restricted accounts
  - manage recipes and produce a shopping list with two-phase checkoff
  - earn coins through streaks and spend coins on stickers/tokens (if store enabled)
  - use Sticker Wall without affecting task usability
  - configure appearance (within admin policy)

- Admin can:
  - toggle modules safely
  - configure streaks + store catalog + real-world reward redemption flow
  - review audit logs and sensitive access logs
  - manage role labels and permissions
  - revoke sessions/tokens (if enabled)

- Security:
  - RLS enforced on workspace/patient boundaries
  - RBAC enforced for sensitive operations
  - AuditEvent and SensitiveAccessEvent created as specified
  - attachments do not expose public URLs; signed URL access is logged

---

## 12. Implementation Notes for the Team

- Treat the schema JSON as canonical for:
  - fields, enums, invariants
  - audit expectations
  - ledger authority rules
- Treat the Visual Design Spec as canonical for:
  - theming presets and admin policy
  - motion timing and reduced motion
  - sticker wall UX constraints and decoration containment
  - semantic color rules and accessibility

**Key architectural choice:** ledgers are authoritative; caches exist only for speed and must be recomputable.

---

## 13. Suggested v1.0 Build Order (Pragmatic)

1. Identity + workspace + RBAC + RLS + audit foundations
2. Tasks + recurrence + Today screen + points ledger + levels cache
3. Events + calendar + transition buffers + notifications
4. Medications + prescriptions + schedules + intake + inventory + refill notifications + renewal plans
5. Wellbeing + provider discussion items
6. Budget (accounts + planned + actual)
7. Recipes + shopping list
8. Streaks + coins ledger + store + sticker wall + grace tokens
9. Admin control panel + redemption workflow + security screens

This order minimizes risk by getting the “trust layer” (security + explainability) in place early.

---