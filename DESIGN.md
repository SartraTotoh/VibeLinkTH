---
name: Cyberpunk Neon Glass
aliases: [Pank, dark]
colors:
  surface: '#111319'
  surface-dim: '#111319'
  surface-bright: '#37393f'
  surface-container-lowest: '#0c0e13'
  surface-container-low: '#191b21'
  surface-container: '#1e1f25'
  surface-container-high: '#282a30'
  surface-container-highest: '#33353a'
  on-surface: '#e2e2e9'
  on-surface-variant: '#c2caae'
  inverse-surface: '#e2e2e9'
  inverse-on-surface: '#2e3036'
  outline: '#8c947a'
  outline-variant: '#424934'
  surface-tint: '#9ad900'
  primary: '#ffffff'
  on-primary: '#233600'
  primary-container: '#b2f722'
  on-primary-container: '#4c6e00'
  inverse-primary: '#486800'
  secondary: '#ffade3'
  on-secondary: '#5f004f'
  secondary-container: '#c000a2'
  on-secondary-container: '#ffe0f0'
  tertiary: '#ffffff'
  on-tertiary: '#370096'
  tertiary-container: '#e7deff'
  on-tertiary-container: '#6d48d7'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#b2f722'
  primary-fixed-dim: '#9ad900'
  on-primary-fixed: '#131f00'
  on-primary-fixed-variant: '#354e00'
  secondary-fixed: '#ffd8ee'
  secondary-fixed-dim: '#ffade3'
  on-secondary-fixed: '#3a0030'
  on-secondary-fixed-variant: '#860070'
  tertiary-fixed: '#e7deff'
  tertiary-fixed-dim: '#cdbdff'
  on-tertiary-fixed: '#20005f'
  on-tertiary-fixed-variant: '#4e22b8'
  background: '#111319'
  on-background: '#e2e2e9'
  surface-variant: '#33353a'
typography:
  display-lg:
    fontFamily: DM Sans
    fontSize: 3.5rem
    fontWeight: '700'
    lineHeight: 4rem
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: DM Sans
    fontSize: 2.25rem
    fontWeight: '700'
    lineHeight: 2.75rem
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: DM Sans
    fontSize: 2rem
    fontWeight: '700'
    lineHeight: 2.5rem
    letterSpacing: -0.02em
  headline-md:
    fontFamily: DM Sans
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: DM Sans
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.01em
  body-lg:
    fontFamily: DM Sans
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: 1.75rem
    letterSpacing: -0.005em
  body-md:
    fontFamily: DM Sans
    fontSize: 0.9375rem
    fontWeight: '400'
    lineHeight: 1.5rem
    letterSpacing: 0em
  body-sm:
    fontFamily: DM Sans
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.25rem
    letterSpacing: 0.01em
  label-lg:
    fontFamily: DM Sans
    fontSize: 0.875rem
    fontWeight: '600'
    lineHeight: 1.25rem
    letterSpacing: 0.02em
  label-md:
    fontFamily: DM Sans
    fontSize: 0.75rem
    fontWeight: '600'
    lineHeight: 1rem
    letterSpacing: 0.04em
  label-sm:
    fontFamily: DM Sans
    fontSize: 0.6875rem
    fontWeight: '500'
    lineHeight: 0.875rem
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system channels an atmospheric cyberpunk sensibility—merging dark, obsidian industrial substrates with vivid, high-chroma kinetic luminescence. The aesthetic avoids retro novelty in favor of ultra-modern club-culture tech: glassmorphic refraction, precision optical glow, and razor-sharp typographic hierarchy.

Designed for next-generation social connectivity, audio-visual interaction, and digital nightspaces, the visual tone balances deep nocturnal serenity with striking bursts of hyper-saturated neon. Interfaces feel alive, tactile, and reactive, immersing users within a futuristic console of glass, electricity, and void.

## Colors

The palette operates on extreme dynamic range: deeply saturated light emerging from lightless synthetic voids.

- **Base Void (`#080a0f`):** The definitive root canvas background, grounding viewports with total nocturnal depth.
- **Obsidian Containers:** `#141922` (primary card and panel base), `#1d2530` (elevated states, nested tiles, active fills).
- **Glass Borders:** `#2b3440` with variable alpha (typically 40%–60%) providing delicate physical containment without light leakage.
- **Electric Kinetic Lime (`#b9ff2c`):** Primary system driver. Denotes affirmative actions, high-priority interactions, live connections, and primary focal points.
- **Hot Radiant Pink (`#ff4fd8`):** Secondary kinetic accent. Dictates social triggers, reactive pulses, notifications, and emotional metrics.
- **Electric Violet (`#9270ff`):** Tertiary tonal balance. Governs ambient state backdrops, audio feeds, badges, and deep atmospheric glows.
- **Typography Tones:** `#f7f9f3` for stark, legible foreground contrast; `#a1a9b1` for secondary context and structural metadata.

## Typography

DM Sans delivers a clean, geometric silhouette that cuts through heavy dark surfaces and high-intensity neon backdrops.

- **Weight Discipline:** Restrict usage to weights 400 (Body), 500/600 (Labels and Subsection Headers), and 700 (Display/Headlines). This preserves optical clarity against glowing overlays.
- **Letter Spacing:** Tighter negative tracking on large display scales intensifies the modern, punchy tech feel. Positive tracking on smaller labels (`label-md`, `label-sm`) maintains legibility when displayed over translucent containers.
- **Contrast Guarding:** Never render text below `#a1a9b1` on dark containers; never render text directly on unfocused bright neon without an obsidian background wrapper.

## Layout & Spacing

The layout adopts a flexible 12-column grid for wide viewports, transitioning into a 6-column grid on tablet and a single/two-column fluid layout on mobile.

- **Desktop (1024px+):** Fluid container capped at 1440px max width. 2rem (`margin`) canvas gutters with 1.25rem (`gutter`) intra-grid separation.
- **Tablet (768px - 1023px):** Compact grid with 1.5rem margins and 1rem column separation. Nested panels transition from side-by-side to stacked orientations.
- **Mobile (<768px):** 1rem screen margins with 0.75rem item gaps. Floating navigational triggers hug bottom safe areas to enable thumb-driven interaction.
- **Density:** Tight intra-card spacing paired with deliberate macro-spacing creates distinct groupings without structural clutter.

## Elevation & Depth

Visual hierarchy uses frosted glassmorphism layered over dynamic radial neon gradients, eschewing classic drop shadows.

- **Layer 0 (Canvas):** Pure `#080a0f` base with stationary or wandering ambient light leaks: subtle radial blurs (400px–600px radius, 10%–15% opacity) in `#ff4fd8` and `#9270ff`.
- **Layer 1 (Glass Panels & Cards):** Background `rgba(20, 25, 34, 0.70)` overlaid with a `16px` to `24px` backdrop-blur filter. 1px solid border rendered in `rgba(43, 52, 64, 0.60)`. Top edge highlights leverage a 1px pseudo-inset border fading from `rgba(247, 249, 243, 0.15)` to transparent.
- **Layer 2 (Floating Overlays & Modals):** Background `rgba(29, 37, 48, 0.85)` with `32px` backdrop-blur. Outlines brighten to `rgba(43, 52, 64, 0.90)`. Enhanced with an ambient light halo: `box-shadow: 0 0 30px -5px rgba(185, 255, 44, 0.12), 0 20px 40px -15px rgba(0, 0, 0, 0.7)`.
- **Active / Interactive Glows:** Hover and focused states introduce sharp neon projections using dual shadows: an inner micro-highlight (`inset 0 0 12px rgba(185, 255, 44, 0.15)`) coupled with an external chromatic glow (`0 0 20px rgba(185, 255, 44, 0.35)`).

## Shapes

The design system uses squircle geometries with smooth corner curvature.

- **Cards & Major Panels:** Apply standard 1rem (`rounded-lg`) to 1.5rem (`rounded-xl` / squircle-2xl) curvature. The large curvature softens the harsh, clinical nature of the cyber palette, making the glass forms feel polished and tactile.
- **Buttons & Control Elements:** Use 0.5rem corner rounding for compact operational tools, extending to full pill radii (`9999px`) exclusively for badges, tags, and selected floating pill toggles.
- **Embedded Media:** Image viewports and inner containers inherit 0.75rem (`rounded-md` equivalent) to preserve concentric alignment with parent containers.

## Components

### Buttons
- **Primary Kinetic:** Background `#b9ff2c`, text `#080a0f`, font weight 700. Borderless with an ambient hover glow (`0 0 24px rgba(185, 255, 44, 0.45)`). Scales down to `0.98` on click.
- **Secondary Glass:** Background `rgba(29, 37, 48, 0.6)`, text `#f7f9f3`, 1px border `rgba(43, 52, 64, 0.8)`. Hover introduces a `#ff4fd8` border illumination and light internal glass sheen.
- **Tertiary / Ghost:** Transparent background, text `#a1a9b1`, hover text `#b9ff2c` with an animated underline or subtle background glow.

### Chips & Badges
- Pill-shaped (`rounded-full`), padded with `0.25rem 0.75rem`.
- Background `rgba(20, 25, 34, 0.8)` with a 1px border colored according to state (Lime for Active/Online, Violet for Status, Pink for Hot/Trending).
- Text styled in `label-sm` uppercase with high tracking.

### Cards
- Surface base of `#141922` at 70% opacity, backed by `16px` blur and framed with a `1px` translucent border (`#2b3440`).
- Interior content follows strict padding rules (`space-lg`).
- Ambient background shifts: As cards receive cursor focus, dynamic radial gradients (`rgba(255, 79, 216, 0.08)` to transparent) track internally.

### Form Inputs & Fields
- Dark input fields built with background `#141922` and 1px border `rgba(43, 52, 64, 0.7)`.
- Placeholder text in `#a1a9b1` at 50% opacity. Input text in crisp `#f7f9f3`.
- Focus state instantly trades dull borders for `#b9ff2c` paired with an external `0 0 12px rgba(185, 255, 44, 0.25)` drop-bloom.

### Checkboxes & Radios
- Squared-off squircle frames (0.25rem radius) for checkboxes; circular rings for radios.
- Inactive state: 1px border in `#2b3440` over `#141922`.
- Checked state: `#b9ff2c` solid fill with `#080a0f` icon checkmark, emitting a localized neon shadow.

### Lists & Activity Feeds
- Transparent list items separated by faint gradient rules (`linear-gradient(90deg, transparent, #2b3440, transparent)`).
- Hovering an item transitions background to `rgba(29, 37, 48, 0.4)` and illuminates a left-aligned vertical neon accent line.

### Live Presence Indicators (Custom VibeLink Element)
- Pulsing concentric rings utilizing `#b9ff2c` and `#ff4fd8`.
- Core dot rendered at 8px width with an outer infinite CSS pulse wave dissolving into the dark void.
