# Emily Mission Log — Final Developer-Ready Specification (Netlify + Supabase)
Version: v1.1.0  
Date: 2026-01-29  
Primary device: iPad (tablet-first web app)

---

## 0) Product summary

A calm, tablet-first planner + light gamification system for Emily.

Core features:
- **Home** (default landing): calm dashboard + sticker decorating
- **Mission Log (Today)**: the daily task list (minimal by default, flexible when Emily wants more)
- **Calendar**: week + month views for Events
- **Gamification (gentle)**:
  - Missions earn **Victory Points (VP)**
  - VP increases **Level**
  - Level-ups grant **Coins**
  - Coins purchase **Stickers** (for Home decorating) and **Grace Tokens** (to protect weekly streaks)
  - **Weekly streaks only** (for weekly missions) → **Badges**
- **Mood Check-ins**: 3× per day, 3-hour cooldown; **How We Feel–style** selection; logs visible **only to Joey** (for now)
- **Health Log (NEW)**:
  - Medication list with **pill counts**, **Rx/refill numbers**, pharmacy info, refill remaining
  - Care team log: **doctors**, **therapist**, **groups**, etc.
  - Optional medication intake logging (taken/not taken) as a simple record
  - Gentle refill-risk indicators + Joey in-app alerts
- **Shared access**:
  - Emily (primary)
  - Up to 3 Support accounts
  - Joey (super admin)
- **No offline support** in v1

Key simplifications:
- No mission occurrence generation table/jobs.
- “Done today” is driven by **completion records**.
- End-of-day handling is **lazy rollover** on app open (no cron).

---

## 1) Emotional design and aesthetics (non-negotiable)

### Visual style
- Simple, calm, supportive UI: generous spacing, clear typography, large touch targets (>= 44px).
- Cute icons and subtle micro-animations:
  - Completion: small “sparkle” or gentle check animation
  - Level-up: small confetti burst (brief, not loud/flashy)
  - Badge earned: gentle pop-in
- Avoid shame language:
  - Prefer “Due today”, “From earlier”, “Still available today”
  - Avoid “Overdue”, “Failed”, “Broken streak” phrasing in Emily UI
- Health UI must be especially neutral:
  - “Refill soon” (not “danger”)
  - “Running low” (not “critical”)

### Behavioral design
- Minimal default daily list; no “doom backlog” feeling.
- A Joey-configurable “Daily Win” threshold triggers: **“You did enough today.”**
- Gamification is supportive and optional-feeling; it must not punish.

---

## 2) Roles and permissions

### Roles
- **Emily (primary)**:
  - Can create missions (one-time or recurring) and goals (Destinies)
  - Can complete missions and event-tasks
  - Can reorder today’s list (today-only)
  - Can place owned stickers on Home
  - Can submit mood check-ins
  - Can view her Health Log (med list + care team)
  - Can optionally log “medication taken” entries if enabled by Joey
- **Support** (max 3; identical permissions):
  - Can view everything Emily sees **except Joey-only mood history**
  - Can add Events to Calendar
  - Can add One-Time Missions
  - Can propose Recurring Missions (approval rules below)
  - Can create Quests
  - Can edit/delete only Events they created
  - Health permissions are configurable by Joey (default: view-only)
- **Joey (super admin)**:
  - Full admin console
  - Approves recurring proposals (unless urgent)
  - Configures categories/VP, level thresholds, coin rewards, sticker catalog, streak/grace settings, daily win threshold
  - Configures Health Log visibility and edit permissions
  - Can edit/delete anything
  - Can “repair” history if needed
  - Can view mood logs

### Approval rules
- Support recurring mission proposals require **Joey approval** unless marked **Urgent**, in which case they activate immediately.

### Mandatory rules
- Emily cannot set “mandatory”.
- Mandatory is primarily **category-level**, plus Events can be optional/mandatory.
- Mandatory is an **icon and gentle cue** in Emily UI; no harsh red/alarms.

### Mood logs visibility (unchanged)
- Emily can INSERT mood logs.
- Mood log history is visible only to Joey.

### Health Log visibility (new, configurable)
Health data can be sensitive. Use an explicit config:
- Default:
  - Emily: view
  - Support: view-only
  - Joey: full edit
- Joey can change to:
  - Support: no access / view / edit
  - Emily: view / view+log intake

---

## 3) Core concepts

### Mission
A single task with optional instructions + steps.

Types:
- **One-time (Irregular)**:
  - **Day-assigned**: due on a specific date
  - **Week-assigned**: belongs to a Mon–Sun week bucket; can later be pinned to a day
- **Recurring**:
  - Daily
  - Weekly
  - Specific weekdays

### Mission Log
Daily list with:
- Today’s missions
- “This Week” section for week-assigned one-offs (floating tray)
- Bonus objectives
- Event-tasks (events appear as a task on their date)
- Optional “Medication Today” chip (if Joey enables)

### Event
Time-based calendar item. Every event appears in Mission Log as an “event-task” on that day.
Completing the event-task marks the event as **Completed**.

Events can be optional or mandatory:
- Mandatory events award extra VP (see Economy).

### Goals
- **Destiny**: Emily-created goal bundle (ordered missions + optional attachments)
- **Quest**: Support-created goal bundle (same structure)

v1: No milestone subsystem. A goal is simply an ordered list of linked missions.

### Weekly Streaks (only)
Streaks exist only for weekly missions:
- Each week (Mon–Sun), completing the weekly mission at least once counts.
- Missing a week breaks the streak unless protected by a grace token.

### Stickers
Coins buy stickers. Emily can place stickers on her Home page.

### Mood Check-ins (How We Feel–style)
Energy vs pleasantness quadrant selection → 1–2 feelings → optional intensity.
Up to 3/day with 3-hour cooldown. History visible only to Joey.

### Health Log (NEW)
- **Medications** with pill counts, Rx/refill numbers, pharmacy, prescriber
- **Care Team**: doctors, therapist, groups, etc.
- Optional **Medication Intake Log**: timestamped entries (“took dose”) used for tracking only (not gamified by default)
- Gentle “refill soon” indicators + Joey in-app todos

---

## 4) Primary screens and flows

### 4.1 Home (default landing page)
Home must remain uncluttered and emotionally soft.
Contains:
- “Today status” summary (e.g., “2 done • 1 left”)
- VP / Level / Coins summary
- Recent badges (small, optional)
- **Mood Check-in widget** (prominent when available)
- **Add button** (the “superpower”)
- Sticker canvas area (place/arrange stickers)
- Optional small “Medication Today” chip (if enabled)

### 4.2 Mission Log (Today)
Single list (no must/should/nice sections).
Sections:
1) Today’s tasks
2) “This Week” tray (floating week-assigned one-offs; show top 3 collapsed, “Show more” expands)
3) Bonus objectives (mood is shown more prominently than others)

Interactions:
- Complete (Emily/Joey only)
- Snooze (within rules)
- Drag reorder (today only; does not persist)
- **Start next task** button: opens the next incomplete item as a big “focus card” (without entering a separate focus mode)

### 4.3 Calendar (Week + Month)
- Shows events
- Create/edit/delete events (permissions apply)
- Events show optional/mandatory icon (subtle)

### 4.4 Goals (Destinies / Quests)
- Ordered mission list
- Optional attachments/links
- Optional instructions
- Completion semantics: all linked missions completed at least once (see §10.6)

### 4.5 Sticker Shop
- Catalog of stickers (Joey-configurable)
- Purchase with coins (confirmation shows cost + remaining coins)
- Owned stickers can be placed on Home
- No external fulfillment workflow

### 4.6 Health (NEW tab/page)
A calm, neutral page with two sections:

**A) Medications**
- List of current meds with:
  - name
  - dosage instructions
  - pills on hand
  - refill remaining count
  - Rx/refill number(s)
  - pharmacy
  - prescriber
  - next refill due date (optional)
- Gentle status chips:
  - “Running low”
  - “Refill soon”

**B) Care Team**
- Providers and groups with:
  - type: doctor / therapist / group / other
  - contact info
  - notes
  - optional link to schedule portal
- “Groups” can be treated as a provider type (with meeting notes), and their sessions can be Events.

Optional: a simple “Log dose taken” button per medication (if enabled by Joey).

---

## 5) The “Add button superpower” (required)

Tap **Add** → 2-step flow:

**Step 1: “What is it called?”** (short title)

**Step 2: “When is it?”**
A) Today  
B) Another day (date picker)  
C) This week (Mon–Sun)  
D) Recurring

If Recurring reminder:
- Daily / Weekly / Specific weekdays

After Step 2:
- Category required (assigns VP automatically)
- Optional: instructions, steps, deadline

Copy: “You can add steps later.”

---

## 6) Scheduling, snooze, and rollover rules

### 6.1 Canonical time
All “today/week” logic is canonical to **America/New_York**.
Week definition: **Monday–Sunday**.

### 6.2 Snooze rules (Emily)
Emily may snooze one-time missions:
- by a few hours (UI deferral; optional persistence via snoozed_until)
- by 1 day at a time
…never past final deadline (if set).

### 6.3 Lazy rollover (no cron)
On app open, for missed days apply category end_of_day_policy to one-time day-assigned missions not completed:
- carryover_next_day → move due_date forward
- never_carryover → leave in the past (“From earlier”)
- convert_to_this_week → move into current week bucket

### 6.4 Late completion and VP
- If scheduled for today → awards full VP
- If from earlier and not rolled forward → completion allowed but awards 0 VP (default)
- Joey can repair and optionally grant VP.

---

## 7) Deadlines at risk (subtle for Emily + Joey in-app)

On deadline date if incomplete:
- Emily sees subtle “Due today”
- Joey gets in-app todo: `deadline_risk`

---

## 8) Mood Check-ins (How We Feel–style)

### 8.1 UX
Quadrant selection (energy x pleasantness) → choose 1–2 feelings from that quadrant → optional intensity (1–5) → submit.

### 8.2 Gating
- Up to 3/day
- 3-hour cooldown between logs
- Visible only to Joey in history view.

### 8.3 Vocabulary
Data-driven in DB (see tables) so Joey can tune/expand.

---

## 9) Health Log requirements (NEW)

### 9.1 Medication fields
Each medication record must support:
- Medication name (free text)
- Dosage instructions (free text or markdown)
- Schedule notes (optional; reminders are modeled via Missions, not required here)
- **Pills on hand** (integer)
- **Rx number / refill number** (string; allow multiple if needed)
- **Refills remaining** (integer)
- Pharmacy name + phone + address (optional)
- Prescriber (link to provider record)
- Last refill date (optional)
- Next refill due date (optional)
- “Low supply” threshold (integer; optional)
- Notes

### 9.2 Refill risk indicators (gentle)
If pills_on_hand <= low_supply_threshold OR refills_remaining <= 0:
- Show a gentle status chip to Emily: “Refill soon” / “Running low”
- Create a Joey in-app todo:
  - type: `health_refill_risk`
  - title: `Refill risk: <med name>`
  - related_id: medication_id

Implementation note (simple, no cron):
- Evaluate these conditions lazily on app open and Health page open.
- Create todos idempotently using a unique constraint or “open todo exists” check.

### 9.3 Optional medication intake logging
If enabled by Joey:
- Emily can log an intake entry for a medication:
  - timestamp
  - medication_id
  - optional dose amount
  - optional note
This log is visible to Joey. (Emily may optionally be allowed to see “today only” confirmations; history remains Joey-only by default.)

### 9.4 Care team log
Must support recording:
- Doctors
- Therapist(s)
- Groups (support groups, therapy groups, etc.)
- Other providers (case manager, etc.)

Fields:
- Type, name, specialty/role
- Contact info (phone/email)
- Address (optional)
- Website/portal URL (optional)
- Notes

Groups:
- Stored as provider type `group`
- Group meetings can be tracked as Events (Calendar) if desired.

### 9.5 Access control (configurable)
- Emily can view her meds and care team.
- Joey can edit everything.
- Support access to Health is controlled via Joey config:
  - none / view / edit

---

## 10) Data model (Postgres / Supabase)

> All existing tables from v1.0.0 remain. Below includes the full set plus Health additions and minor extensions.

### 10.1 profiles
`profiles`
- `id uuid pk`
- `display_name text`
- `role_global text` enum: `emily | support | joey`
- `active boolean`

### 10.2 support_links
`support_links`
- `emily_user_id uuid`
- `support_user_id uuid`
- `active boolean`
- max 3 active supports constraint

### 10.3 categories
`categories`
- `name text unique`
- `vp_value int`
- `end_of_day_policy enum(carryover_next_day, never_carryover, convert_to_this_week)`
- `is_mandatory_default boolean`

### 10.4 missions
`missions`
- (as previously specified)
- optional `snoozed_until timestamptz`

### 10.5 events
`events` (as previously specified)

### 10.6 completions
`mission_completions` unique(mission_id, completion_date)  
`event_completions` unique(event_id)

### 10.7 bonus objectives
`bonus_objectives`, `bonus_completions` (as previously specified)

### 10.8 goals
`goals`, `goal_items` (as previously specified)

### 10.9 economy
`economy_state` (as previously specified)

`economy_config`
- `level_thresholds jsonb`
- `coins_per_level jsonb`
- `daily_win_threshold int`
- `mandatory_event_multiplier numeric default 1.5`
- `grace_token_cost int`
- `weekly_streak_prompt_day int default 0`
- `weekly_streak_prompt_hour int default 18`

### 10.10 streaks + badges + grace
`weekly_streak_state`, `badges`, `grace_tokens` (as previously specified)

### 10.11 stickers
`sticker_catalog`, `sticker_ownership`, `sticker_placements` (as previously specified)

### 10.12 mood (How We Feel–style)
`mood_feelings`, `mood_logs` (as previously specified)

### 10.13 Joey todos / inbox
`joey_todos`
- `type enum: deadline_risk | urgent_report | health_refill_risk`
- `status enum: open | done`

### 10.14 mission proposals
`mission_proposals` (as previously specified)

---

## 11) Health Log tables (NEW)

### 11.1 Health access config (per Emily owner)
`health_access_config`
- `id uuid pk`
- `owner_user_id uuid not null` (Emily)
- `support_access text not null default 'view'` enum: `none | view | edit`
- `emily_can_log_intake boolean not null default true`
- `emily_can_view_intake_history boolean not null default false` (default: Joey-only history)

### 11.2 Providers (doctors, therapist, groups, etc.)
`health_providers`
- `id uuid pk`
- `owner_user_id uuid not null` (Emily)
- `provider_type text not null` enum: `doctor | therapist | group | other`
- `name text not null`
- `specialty_or_role text null`
- `phone text null`
- `email text null`
- `address text null`
- `portal_url text null`
- `notes_md text null`
- `active boolean not null default true`

### 11.3 Pharmacy (optional normalized table)
`health_pharmacies`
- `id uuid pk`
- `owner_user_id uuid not null`
- `name text not null`
- `phone text null`
- `address text null`
- `notes_md text null`
- `active boolean not null default true`

### 11.4 Medications
`health_medications`
- `id uuid pk`
- `owner_user_id uuid not null` (Emily)
- `name text not null`
- `instructions_md text null` (dosage instructions)
- `pills_on_hand int null`
- `low_supply_threshold int null` (if pills_on_hand <= threshold → refill risk)
- `rx_numbers text[] null` (supports multiple)
- `refills_remaining int null`
- `last_refill_date date null`
- `next_refill_due_date date null`
- `pharmacy_id uuid null references health_pharmacies(id)`
- `prescriber_provider_id uuid null references health_providers(id)`
- `notes_md text null`
- `active boolean not null default true`

### 11.5 Medication intake logs (optional)
`health_med_intake_logs`
- `id uuid pk`
- `owner_user_id uuid not null` (Emily)
- `medication_id uuid not null references health_medications(id)`
- `taken_at timestamptz not null`
- `dose_text text null` (e.g., “1 pill”, “10mg”)
- `note text null`
- `created_by_user_id uuid not null` (Emily or Joey)

### 11.6 Optional “refill events” log (simple)
`health_refill_logs`
- `id uuid pk`
- `owner_user_id uuid not null`
- `medication_id uuid not null references health_medications(id)`
- `refill_date date not null`
- `pills_added int null`
- `refills_remaining_after int null`
- `rx_number_used text null`
- `note text null`
- `created_by_user_id uuid not null`

---

## 12) Core behaviors (Health)

### 12.1 Refill risk evaluation (lazy, no cron)
On app open and on Health page open:
For each active medication:
- If low_supply_threshold is set AND pills_on_hand is set AND pills_on_hand <= low_supply_threshold → risk
- If refills_remaining is set AND refills_remaining <= 0 → risk
- If next_refill_due_date is set AND next_refill_due_date == today → risk

If risk:
- Show Emily “Refill soon” chip (neutral)
- Create Joey todo `health_refill_risk` if one is not already open for that medication

Idempotence:
- Joey todo creation must check for an existing open todo with related_id = medication_id and type = health_refill_risk.

### 12.2 Optional “Medication Today” chip
If Joey enables:
- Home can show a tiny chip linking to Health or highlighting “Medication”
- This does not add new missions automatically by default (keep it simple).
- Medication reminders remain modeled as Missions (e.g., a recurring mission in a mandatory category).

---

## 13) Security (Supabase RLS) — Health additions

### Health visibility rules (by health_access_config)
- Joey can always read/write all Health tables.
- Emily can read her own Health tables.
- Support:
  - If support_access = none → no access
  - If support_access = view → select allowed, no updates/inserts
  - If support_access = edit → may insert/update (except Joey-only areas if specified)

Medication intake logs:
- INSERT by Emily allowed only if emily_can_log_intake = true.
- SELECT:
  - Joey always
  - Emily only if emily_can_view_intake_history = true (default false)
  - Support depends on support_access and a Joey decision; default: view not allowed unless support_access=edit (to reduce sensitive visibility).

Mood logs remain Joey-only SELECT.

---

## 14) Hosting and deployment

### Netlify
- Frontend SPA
- Env vars:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

### Supabase
- Auth: email/password + password reset
- Postgres migrations + RLS policies
- Storage:
  - Sticker images bucket (public read recommended; catalog edits controlled by Joey)
  - Optional attachments bucket

---

## 15) Acceptance criteria (developer-testable) — additions

### AC-011 Health: medication log
- Joey can create medications with pills_on_hand, rx_numbers, refills_remaining, pharmacy, prescriber.
- Emily can view medication list.
- Support access matches health_access_config.

### AC-012 Health: refill risk
- When a med is low (threshold) or refills_remaining <= 0:
  - Emily sees “Refill soon” (neutral)
  - Joey gets one in-app todo per medication (idempotent)

### AC-013 Health: care team
- Joey or Emily can add doctors/therapists/groups with contact info.
- All can view care team list.
- Groups can be entered and optionally scheduled as Events.

### AC-014 Health: intake logging (if enabled)
- If enabled by config:
  - Emily can log a “took dose” entry
  - Joey can view the intake log with timestamps
  - Emily cannot view intake history by default

---