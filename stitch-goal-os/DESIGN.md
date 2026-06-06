---
name: Identity Operating System
colors:
  surface: '#faf9f8'
  surface-dim: '#dadad9'
  surface-bright: '#faf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f2'
  surface-container: '#eeeeed'
  surface-container-high: '#e9e8e7'
  surface-container-highest: '#e3e2e1'
  on-surface: '#1a1c1c'
  on-surface-variant: '#3f4944'
  inverse-surface: '#2f3130'
  inverse-on-surface: '#f1f0f0'
  outline: '#6f7973'
  outline-variant: '#bec9c2'
  surface-tint: '#1b6b51'
  primary: '#004532'
  on-primary: '#ffffff'
  primary-container: '#065f46'
  on-primary-container: '#8bd6b7'
  inverse-primary: '#8bd6b6'
  secondary: '#544fc0'
  on-secondary: '#ffffff'
  secondary-container: '#8f8bff'
  on-secondary-container: '#231791'
  tertiary: '#563400'
  on-tertiary: '#ffffff'
  tertiary-container: '#764900'
  on-tertiary-container: '#ffb960'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a6f2d1'
  primary-fixed-dim: '#8bd6b6'
  on-primary-fixed: '#002116'
  on-primary-fixed-variant: '#00513b'
  secondary-fixed: '#e2dfff'
  secondary-fixed-dim: '#c3c0ff'
  on-secondary-fixed: '#0f0069'
  on-secondary-fixed-variant: '#3b35a7'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#faf9f8'
  on-background: '#1a1c1c'
  surface-variant: '#e3e2e1'
typography:
  display:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 24px
  margin: 32px
---

## Brand & Style
The design system is centered on the concept of "Intentionality through Clarity." It transforms the traditional productivity tool into a calm, focused environment that feels less like a to-do list and more like a physical workspace for personal evolution. 

The style is **Modern / Corporate**, leaning heavily into **Minimalism** to reduce cognitive load. Every element serves a purpose; nothing is purely decorative. The interface evokes an emotional response of being "in control"—it is professional enough for high-level planning but warm enough to feel like a personal sanctuary. The "satisfyingly gamified" aspect is handled through high-fidelity micro-interactions and smooth transitions rather than loud colors or heavy textures.

## Colors
The palette is rooted in a warm, sophisticated foundation. The primary background (Canvas) uses a very soft cream-gray to reduce eye strain compared to pure white. 

- **Primary (Emerald):** Used for growth-related indicators: progress bars, XP gains, and successfully completed habits. It represents vitality and movement.
- **Secondary (Indigo):** Reserved for identity-based elements: user profile, deep work sessions, and long-term vision. It represents depth and stability.
- **Tertiary (Amber):** Used sparingly for "Streaks" or high-priority warnings to provide a warm focal point.
- **Neutrals:** A range of warm grays ensure that the UI feels grounded and organic rather than clinical.

## Typography
Typography is the primary driver of the hierarchy. We use **Manrope** for headlines to provide a modern, slightly geometric warmth that distinguishes the system from standard "SaaS" tools. **Inter** is used for body text and UI labels due to its exceptional legibility at small scales and neutral, functional character.

Large display type should be used for daily affirmations or high-level goals. Labels use a slightly increased letter spacing and uppercase styling to clearly denote metadata without competing with body content.

## Layout & Spacing
This design system utilizes a **Fixed Grid** philosophy for desktop to maintain a "focused sheet" appearance, centering the content to prevent the eye from scanning too wide. On mobile, the system transitions to a fluid model with generous margins.

The spacing rhythm is strictly based on an 8px unit. All vertical rhythm and internal card padding should be multiples of 8. We prioritize "breathability"—when in doubt, increase the margin. White space is treated as a functional element that separates different "life domains" within the OS.

## Elevation & Depth
Depth is created through **Tonal Layers** and **Ambient Shadows**. We avoid heavy dropshadows in favor of subtle, highly-diffused shadows that make cards appear as if they are resting gently on the warm background.

- **Level 0 (Canvas):** The #F9F8F6 background.
- **Level 1 (Cards):** Pure white surfaces with a 1px soft gray border (#E5E7EB) and a 4px blur shadow at 5% opacity.
- **Level 2 (Modals/Popovers):** Elevated cards with an 8px blur shadow at 10% opacity to denote immediate action.

No glassmorphism is used; we prioritize solid, reliable surfaces that feel permanent and grounded.

## Shapes
The shape language is consistently **Rounded** (8px/0.5rem base). This specific radius strikes a balance between professional precision and approachable softness. 

- **Primary Cards:** 8px corner radius.
- **Inputs & Buttons:** 8px corner radius.
- **XP/Progress Badges:** Full pill-shape (999px) to contrast against the structured grid and signify "active" or "dynamic" elements.

## Components
- **Buttons:** Primary buttons use the Indigo or Emerald backgrounds with white text. They have no gradient, relying on a slight vertical offset on hover to simulate a physical "press."
- **Progress Bars:** Thin (4px or 8px) tracks with rounded caps. The track is a muted version of the accent color, while the progress fill is the vibrant primary color.
- **Identity Cards:** Used for user stats (XP, Level). These cards use a subtle tint of the primary color as their background to distinguish them from standard task cards.
- **Input Fields:** Minimalist design with a 1px border. On focus, the border color changes to the primary emerald and gains a very soft outer glow.
- **Checkboxes:** When checked, they should provide a satisfying visual "pop"—animating the emerald fill from the center outwards to reward the user for task completion.
- **Lists:** Items are separated by generous whitespace rather than heavy dividers. A simple 1px hairline is used only when content density is high.