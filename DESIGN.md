---
name: Goal OS
description: A local-first personal operating system for the disciplined builder.
colors:
  canvas: "#151a16"
  surface: "#1d2320"
  surface-raised: "#232a25"
  line: "#2d3630"
  text: "#e4ebe5"
  muted: "#748a78"
  primary: "#2e8c62"
  primary-soft: "#1e3328"
  danger: "#c04535"
  gold: "#c49020"
  purple: "#8170d0"
  sidebar: "#131813"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.02em"
rounded:
  xs: "3px"
  sm: "5px"
  md: "8px"
  full: "9999px"
spacing:
  xs: "6px"
  sm: "12px"
  md: "20px"
  lg: "28px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "10px 18px"
  button-primary-hover:
    backgroundColor: "#38a876"
    textColor: "#ffffff"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.sm}"
    padding: "10px 18px"
  button-ghost-hover:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.danger}"
    rounded: "{rounded.sm}"
    padding: "10px 18px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  nav-item-active:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
---

# Design System: Goal OS

## 1. Overview

**Creative North Star: "The Operator's Console"**

Goal OS is not a productivity toy. It is a command interface for running a life deliberately. The visual system takes its cue from precision instrumentation — not cold or sterile, but purposeful. Every pixel justifies its existence. Color is reserved for signal, not decoration. Type carries weight through contrast, not size inflation. The interface steps back so the operator can step forward.

The ambient aesthetic is dark and slightly organic — warm-shifted neutrals with a barely-there green tint, recalling a phosphor terminal in a dim room. Not a developer's IDE; not a SaaS dashboard. A tool that feels like it belongs to the person using it.

This system explicitly rejects: rounded-card SaaS defaults, enterprise utility gray, mobile-game habit-tracker aesthetics, and any surface that looks like it was assembled from a Tailwind component library. If something could appear on a generic SaaS landing page or a Google Workspace panel, it is wrong for Goal OS.

**Key Characteristics:**
- Dark base with warm-green-tinted neutrals (not cool blue-gray)
- Single accent color (green) used sparingly — status, actions, active state only
- Dense information layout; no decorative whitespace
- Weight-based typographic hierarchy (not size-based)
- Flat by default; elevation only for truly raised surfaces
- Motion is immediate and functional; no choreography

## 2. Colors: The Phosphor Palette

A near-monochrome dark palette with a barely-perceptible green tint across every neutral, unified by a single green accent that earns its appearances.

### Primary
- **Operator Green** (`#2e8c62`, oklch(55% 0.14 155)): The sole accent. Navigation active states, primary buttons, checked states, sync badges. Used at ≤10% of any surface.
- **Green Tint** (`#1e3328`, oklch(20% 0.04 155)): Pressed/hovered backgrounds on green elements, subtle highlight regions.

### Neutral
- **Deep Canvas** (`#151a16`, oklch(11% 0.008 145)): Page background. The floor of every surface.
- **Panel Surface** (`#1d2320`, oklch(14.5% 0.009 145)): Card and panel backgrounds. One step above canvas.
- **Raised Surface** (`#232a25`, oklch(17.5% 0.010 145)): Elevated panels, active nav items, hovered rows.
- **Line** (`#2d3630`, oklch(22% 0.010 145)): Borders, dividers, input strokes. Barely visible; structural only.
- **Primary Text** (`#e4ebe5`, oklch(91% 0.008 145)): All body and heading copy. Off-white with green undertone.
- **Muted Text** (`#748a78`, oklch(52% 0.018 145)): Labels, secondary text, nav items at rest, empty states.
- **Sidebar** (`#131813`, oklch(10% 0.009 145)): Sidebar background. Slightly darker than canvas for separation without a border.

### Semantic
- **Alert Red** (`#c04535`, oklch(50% 0.18 25)): Destructive actions, danger states, overdue indicators.
- **Status Gold** (`#c49020`, oklch(65% 0.14 80)): Pending sync, warnings, in-progress indicators.
- **Insight Purple** (`#8170d0`, oklch(58% 0.14 280)): Insight cards, milestone markers.

**The One Voice Rule.** Operator Green appears in one role at a time: it is either an active nav indicator, a button, or a sync badge — never multiple simultaneously on the same row. Its scarcity is the signal.

**The Tinted Neutral Rule.** Every neutral — canvas, panel, sidebar, text — carries the same green hue at a lightness-appropriate chroma. No purely achromatic grays. The palette is a family, not a collection.

## 3. Typography

**Body Font:** Inter (with system-ui, sans-serif fallback)
**Display/Headline Font:** Inter (same family — hierarchy is established through weight contrast alone)

**Character:** Inter at extreme weights (400 / 600 / 700) creates a clean, authoritative hierarchy without introducing a second typeface. The system reads like a control interface spec sheet — every word in its correct weight class.

### Hierarchy
- **Display** (700, 1.5rem, lh 1.2, ls −0.02em): Section or page headers. Rare. Dashboard identity statement, day heading.
- **Headline** (700, 1rem, lh 1.3, ls −0.01em): Panel headings, section titles ("Timeline", "Habits").
- **Title** (600, 0.875rem, lh 1.4): Task titles, habit names, goal names. The workhorse of the interface.
- **Body** (400, 0.875rem, lh 1.6): Descriptions, notes, paragraph content. Max 65ch line length.
- **Label** (500, 0.75rem, lh 1.4, ls +0.02em): Timestamps, badges, counts, metadata chips.

**The Weight Rule.** Hierarchy is expressed through weight (400 / 600 / 700), never through size alone. Two elements at the same size with different weights communicate a relationship. Two elements at different sizes are landmarks. Never use both simultaneously without purpose.

## 4. Elevation

Goal OS is flat by default. Surfaces are distinguished by their background token, not by shadows. The stacking order — canvas → panel-surface → raised-surface — is a tonal sequence, not a physical one.

Shadows appear in exactly one context: a panel that has been floated above the rest of the layout (modals, dropdowns, popovers). These panels use a single shadow: `0 8px 32px rgba(0, 0, 0, 0.45)`. No ambient glow, no spread-heavy lift effects.

**The Shadow Restraint Rule.** If a surface can be distinguished from its background by its background-color token alone, no shadow is added. Shadows are for floating surfaces only.

## 5. Components

### Buttons
- **Shape:** Low-radius (5px). Firm, not pill-soft, not sharp-square.
- **Primary:** Operator Green background (`#2e8c62`), white text, 10px 18px padding. Font-weight 600. Used for the single most important action in a given context.
- **Ghost:** Transparent background, Muted Text color, same padding. On hover: Raised Surface background, Primary Text color. Used for secondary and tertiary actions.
- **Danger:** Transparent background, Alert Red text. No background at rest. Same padding. No filled danger button — the text color alone communicates gravity.
- **Hover / Focus:** 120ms ease-out opacity or background transition. Focus: 2px outline offset with Operator Green.
- **Disabled:** 40% opacity, cursor: not-allowed. No style change beyond opacity.

### Chips / Badges
- Sync status badges (pending, synced, failed): label-weight text, tight padding (4px 8px), 3px radius.
  - Synced: Operator Green text on Green Tint background.
  - Pending: Status Gold text on dark gold tint background.
  - Failed: Alert Red text on dark red tint background.
- Priority chips: colored left-text only, no filled background. High = Alert Red text. Low = Muted text. Normal = no indicator.

### Cards / Panels
- **Background:** Panel Surface (`#1d2320`).
- **Corner Style:** 8px radius.
- **Shadow:** None at rest. Shadow only if floating.
- **Border:** 1px solid Line (`#2d3630`).
- **Internal Padding:** 20px default, 14px compact (task rows).
- Nested cards are prohibited. A card inside a card is always a sign the information architecture is wrong.

### Inputs / Fields
- **Style:** 1px solid Line border, Panel Surface background, 5px radius. Height 40px.
- **Focus:** Border becomes Operator Green. No shadow or glow.
- **Error:** Border becomes Alert Red. Error label appears below in Alert Red label text.
- **Disabled:** 40% opacity. Not-allowed cursor.

### Navigation (Sidebar)
- Background: Sidebar (`#131813`).
- Brand mark: 36px square, Operator Green background, white text, 7px radius.
- Nav items: Ghost style at rest (muted text, transparent background). Active: Raised Surface background, Primary Text, 600 weight. 5px radius.
- Item height: 36px. Gap between items: 2px.
- Section labels (if any): All-caps label style, Muted Text.

### Task Row (Signature Component)
A task row is a scannable line, not a card. Each row: 44px tall, full-width, no card border — sits directly on the panel surface. Left: checkbox (24px, 3px radius, Operator Green when checked). Center: task title (Title weight), inline metadata (time, area label) in Label style. Right: action icons appear on hover only (edit, delete, calendar icon).

The row highlights to Raised Surface on hover. No elevation change, no border appearance.

**The Row Rule.** Task rows never use cards. The distinction between a row and its surrounding panel is background state (hover = raised-surface), not border or shadow. Cards are for panels, not for list items.

## 6. Do's and Don'ts

### Do:
- **Do** keep Operator Green (`#2e8c62`) to ≤10% of any given screen surface. Its rarity is the entire point.
- **Do** use weight contrast (400 / 600 / 700) as the primary typographic hierarchy tool.
- **Do** use `oklch()` when defining new color values; approximate to hex only for Stitch frontmatter.
- **Do** keep all interactive row and list-item hover states to background-color transitions at 120ms ease-out.
- **Do** include focus-visible outlines (2px, Operator Green, 2px offset) on every interactive element.
- **Do** express priority through text color only (red, muted, default) — never through border-left stripes.

### Don't:
- **Don't** use rounded blue cards, Tailwind default components, or any pattern that reads as generic SaaS. If it could appear on a startup marketing landing page, rework it.
- **Don't** use Google/Microsoft enterprise-gray (`#f1f3f4` backgrounds, `#202124` text on white) or any purely achromatic neutral. Every neutral carries the green undertone.
- **Don't** use border-left stripes greater than 1px as a colored accent on task rows, cards, or panels. Prohibited.
- **Don't** use gradient text (`background-clip: text`). Color is a signal, not a decoration.
- **Don't** use glassmorphism (backdrop-filter: blur) decoratively. Not in this interface.
- **Don't** use the hero-metric template (big number + small label + gradient accent) for anything in Goal OS. The dashboard shows real data in density, not vanity metrics.
- **Don't** animate layout properties (height, width, top, left). Transition opacity, transform, and background-color only.
- **Don't** add padding or whitespace for visual balance. Empty space must be justified by breathing room the user needs, not by aesthetic convention.
