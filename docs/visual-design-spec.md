# Visual Design Spec (v1.0) — Web + iOS + Android + macOS

This document describes the **visual system** for the application: themes, color, typography, layout density, motion/animations, stickers/decorations, and a dedicated **Sticker Wall** experience. The intent is to keep the UI **calm, readable, explainable**, and **customizable via safe options**.

---

## 1. Design Goals

- **Low cognitive load**: fewer choices per screen, consistent layout patterns.
- **High readability**: stable typography, strong contrast, predictable spacing.
- **Explainable UX**: numbers (pills left, points, coins, streaks) always have a “why” drill-down.
- **Personal but safe customization**: user/admin can change look-and-feel using **presets**, not free-form design.
- **Cross-platform consistency**: same visual language across web/iOS/Android/macOS with platform-native controls.

---

## 2. Theming System (Options-Based)

### 2.1 Theme controls (member-facing)
Members can adjust appearance through a simple settings panel (if admin policy allows):

- **Theme Mode**: `Light`, `Dark`, `System`
- **Accent Color**: preset palette (no arbitrary color picker)
- **Contrast Mode**: `Standard`, `High Contrast`
- **Text Size**: `Default`, `Large`, `Extra Large`
- **Motion**: `Full`, `Reduced`
- **Privacy Mode (optional)**: `Off`, `On` (see 2.4)
- **Decorations**: `Enabled`, `Header-only`, `Off` (if allowed)

### 2.2 Admin appearance policy
Admin may enforce limits to prevent unreadable or overstimulating setups:

- **Allow member to change appearance**: yes/no
- **Allowed accent set**: multi-select subset of palette
- **Force high contrast**: yes/no
- **Motion policy**: allow full motion / force reduced motion
- **Decorations policy**: allow / header-only / disable entirely

All policy changes should be audited.

---

## 3. Color System

### 3.1 Token approach (do not hardcode colors)
Use design tokens so all platforms map to the same semantic meaning:

- **Surface tokens**: background, cards, elevated surfaces
- **Text tokens**: primary text, secondary text, muted text
- **Border/divider tokens**
- **Accent tokens**: primary button color, focus ring color, selection color
- **Semantic status tokens**: success/warning/danger/info (must remain stable)

### 3.2 Accent palette (safe presets)
Offer 10–12 accent options with names and previews (example set):

- Blue, Teal, Green, Purple, Indigo, Pink, Orange, Yellow, Red, Slate, Mono

Each accent defines:
- `accent_600` (primary actions)
- `accent_700` (pressed/active)
- `accent_100` (tinted backgrounds)
- `accent_contrast` (text/icons on accent)

### 3.3 Semantic colors stay semantic
Accent color is for **actions**, not meaning.

- **Success**: “completed”, “good”
- **Warning**: “due soon”, “low stock”
- **Danger**: “overdue”, “missed”, “urgent”
- **Info**: “reminder”, “note”

Avoid “recoloring” these based on theme accent; keep them stable for recognition.

### 3.4 Contrast and accessibility rules (non-negotiable)
- Do not rely on color alone. Every state must include **icon + label**.
- Presets must meet **WCAG AA** for normal text (High Contrast aims for AAA where feasible).
- Provide strong focus indicators (keyboard/focus ring) using `accent_600`.

---

## 4. Typography and Density

### 4.1 Font strategy
- Use platform defaults where appropriate (San Francisco on Apple, Roboto on Android, system UI fonts on web) to maximize clarity.
- Support text scaling without layout breaking.

### 4.2 Density tiers (platform-adaptive)
- **Mobile**: generous spacing, large tap targets (44pt+).
- **Web/macOS**: slightly denser lists and split panes, but identical component design.

### 4.3 Headings and emphasis
- Use clear hierarchy:
  - Screen title
  - Section headers
  - Card titles
  - Secondary labels
- Avoid decorative typefaces.

---

## 5. Motion / Animation System

### 5.1 Motion philosophy
Motion is functional, not decorative:
- clarifies what changed
- rewards completion gently
- never distracts, never loops unnecessarily

### 5.2 Timing and easing (consistent across platforms)
- **Standard transitions**: 150–220ms, ease-out on enter, ease-in on exit
- **Micro-feedback** (points/coins): 250–450ms, single burst only
- **Avoid excessive spring/bounce**; reserve gentle spring only for sticker placement

### 5.3 Where animations are encouraged
- **Task completion**:
  - checkbox morph → check
  - item compresses slightly, then moves to “Completed”
  - optional “Undo” toast appears
- **Progress updates**:
  - progress bar fills smoothly
  - numbers tick up *briefly* (200–400ms)
- **Navigation**:
  - standard slide/fade transitions
- **Sticker interactions**:
  - soft shadow on drag
  - subtle snap-to-grid or magnetic alignment

### 5.4 Where animations are discouraged
- Confetti for every completion
- Constant pulsing/glowing elements
- Animated backgrounds
- Multiple concurrent motion effects

### 5.5 Reduced motion mode
When Motion is set to `Reduced`:
- Replace movement with fades
- Disable number tick-up (instant change or brief fade)
- Disable sticker bounce; use immediate placement
- Preserve essential state change cues (checkmark fill)

---

## 6. Visual Treatment of Sensitive Content

### 6.1 Sensitive badges
For medication, budgeting, and attachments:
- show subtle “Private” badge (icon + label)
- ensure the badge does not increase clutter

### 6.2 Optional privacy mode
Privacy Mode reduces accidental disclosure:
- On “Today” and “Notifications”, show minimal summaries (e.g., “Medication due” instead of medication name)
- Blur/obscure sensitive details until tapped (optional)
- Always allow immediate reveal with one tap

### 6.3 Secure share UX (visual treatment)
When a user exports or shares:
- show a warning-style confirmation screen
- clearly list what will be shared
- show expiration options for share links (if supported)

---

## 7. Gamification Visual System

### 7.1 Points and levels
- Level indicator: simple badge (pill/circle)
- Points progress: bar in accent color with clear labels
- Completion feedback: small “+X points” toast; no loud effects by default

### 7.2 Coins
Coins should not feel like gambling:
- coin icon is consistent and restrained
- coin count increments with a short tick animation (optional; disabled in Reduced Motion)

### 7.3 Streak chips
Streaks display as compact chips/badges:
- icon + name + current count
- on increment: a brief glow pulse (single frame-ish) on the chip
- avoid flames/flicker animations

---

## 8. Decorations and Stickers

Decorations are valuable for engagement but must never interfere with usability.

### 8.1 Decoration policy
Decorations can be:
- enabled
- restricted to specific areas (header-only / wall-only)
- disabled entirely by admin

### 8.2 Decoration placement rules
- Stickers never appear behind text or interactive controls.
- Stickers live in **dedicated spaces**:
  1) small home-page header strip (optional)
  2) **Sticker Wall** (primary creative space)

### 8.3 High contrast / readability handling
- In High Contrast mode, stickers can get:
  - optional outline mode
  - reduced opacity behind UI elements (if ever overlapped, but overlap should be avoided)

---

## 9. Sticker Wall (Dedicated Creative Space)

### 9.1 Purpose
The Sticker Wall is a **calm, dedicated canvas** for personalization:
- a place to use earned stickers
- does not compete with tasks, meds, or alerts
- provides a motivating “collection and decorating” loop

### 9.2 Location in app
- Accessible from:
  - Today screen (small “Wall” button)
  - More tab → “Sticker Wall”
  - Home page header (tap decoration area opens wall)

### 9.3 Wall layout
- Full-screen canvas with minimal chrome:
  - top bar: back + title + “Edit” toggle
  - bottom bar (in edit mode): sticker tray, undo, reset, done
- Background choices are **preset** (e.g., plain, subtle gradient, soft pattern), admin-limited if desired.

### 9.4 Wall interactions (Edit mode)
- Sticker tray shows:
  - owned stickers
  - quantity (if multiple copies matter)
- Interactions:
  - drag to place
  - tap to select
  - resize/rotate with handles (optional in v1; can be simplified to scale only)
  - delete/remove (sends back to inventory if non-consumable)
  - snap-to-grid or gentle alignment guides (optional)

### 9.5 Wall interactions (View mode)
- No handles, no accidental edits
- One optional interaction: tap a sticker to “inspect” (name, when earned, if relevant)

### 9.6 Wall safety rules
- Editing requires explicit “Edit” toggle
- Undo always available while editing
- Stickers cannot cover essential UI (wall is separate from functional screens)

---

## 10. Platform Notes

### 10.1 iOS / Android
- bottom tab navigation
- large cards, large hit targets
- haptics:
  - light haptic for task completion (optional)
  - none for frequent toggles (avoid overload)

### 10.2 Web
- left sidebar navigation
- split-pane views for lists/details
- keyboard focus states are prominent and consistent

### 10.3 macOS
- same visual tokens as web/iPad
- keyboard shortcuts recommended for core actions (mark done, add event)
- support window resizing without layout collapse

---

## 11. Visual Defaults (Recommended v1.0 baseline)

- Theme Mode: System
- Accent: Blue or Teal (“Calm” preset)
- Contrast: Standard (High Contrast available)
- Motion: Full but restrained (no confetti)
- Decorations: Enabled but contained (header + Sticker Wall)
- Privacy Mode: Off by default, easy to enable

---

## 12. Implementation Notes (Visual-Only)

- All colors and spacing should be tokenized to keep parity across platforms.
- Stickers and attachments should be retrieved via short-lived signed URLs; do not embed public URLs in UI.
- Sensitive access (view/download/share) should produce security logging; the UI should treat these actions as deliberate (confirmations, clear status).