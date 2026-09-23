---
name: VibeLink Electric Frosted
aliases: [Blink, light]
colors:
  surface: '#f9f9ff'
  surface-dim: '#d9d9e0'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3fa'
  surface-container: '#ededf4'
  surface-container-high: '#e8e7ef'
  surface-container-highest: '#e2e2e9'
  on-surface: '#1a1b21'
  on-surface-variant: '#424934'
  inverse-surface: '#2e3036'
  inverse-on-surface: '#f0f0f7'
  outline: '#727a62'
  outline-variant: '#c2caae'
  surface-tint: '#486800'
  primary: '#486800'
  on-primary: '#ffffff'
  primary-container: '#b9ff2c'
  on-primary-container: '#507300'
  inverse-primary: '#9ad900'
  secondary: '#af0093'
  on-secondary: '#ffffff'
  secondary-container: '#fe4ed7'
  on-secondary-container: '#5f004f'
  tertiary: '#6641d1'
  on-tertiary: '#ffffff'
  tertiary-container: '#eee6ff'
  on-tertiary-container: '#714ddc'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
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
  background: '#f9f9ff'
  on-background: '#1a1b21'
  surface-variant: '#e2e2e9'
  brand-ink: '#172000'
  brand-strong: '#72ba00'
  bg-light: '#f5fbea'
  surface-light-soft: '#edf5d8'
  border-light: '#dfe9c7'
  muted-light: '#69716d'
  accent-shopee: '#ee4d2d'
  accent-tiktok: '#c000a2'
  accent-lazada: '#6d48d7'
typography:
  display-hero:
    fontFamily: DM Sans
    fontSize: 44px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.065em
  display-hero-mobile:
    fontFamily: DM Sans
    fontSize: 30px
    fontWeight: '800'
    lineHeight: 32px
    letterSpacing: -0.05em
  headline-lg:
    fontFamily: DM Sans
    fontSize: 22px
    fontWeight: '800'
    lineHeight: 28px
    letterSpacing: -0.03em
  headline-md:
    fontFamily: DM Sans
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
    letterSpacing: -0.02em
  title-sm:
    fontFamily: DM Sans
    fontSize: 15px
    fontWeight: '800'
    lineHeight: 20px
    letterSpacing: -0.01em
  body-md:
    fontFamily: DM Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-sm:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0em
  label-md:
    fontFamily: DM Sans
    fontSize: 13px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: DM Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.02em
  caption:
    fontFamily: DM Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 0.875rem
  gutter-mobile: 0.6875rem
  margin: 1rem
  margin-mobile: 0.75rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.875rem
  space-lg: 1.375rem
  space-xl: 1.875rem
---

## Brand & Style

VibeLink is an energetic, high-conversion utility designed for digital creators, KOL affiliates, and social commerce builders. The visual identity bridges the gap between hyper-vibrant Gen-Z creator culture and slick, reliable SaaS tooling.

The design movement is **Glassmorphism mixed with High-Energy Neon Tactility**. It pairs ultra-smooth frosted-glass card surfaces (`backdrop-blur-2xl` with subtle white translucent fills) with hyper-saturated neon chartreuse, vivid fuchsia, and electric lavender accents. Ambient radial light blooms glow behind surfaces, giving the entire interface an luminous, floaty, iOS-app tactile presence.

## Colors

The palette balances an organic pale-chartreuse background tint (`#f5fbea`) against electric accent highlights:
- **Primary (`#b9ff2c`)**: High-visibility electric lime. Used for primary focus badges, quick-paste triggers, active bottom navigation highlights, and pulsating indicator glows.
- **Secondary (`#ff4fd8`) & Tertiary (`#9270ff`)**: Vivid magenta and electric purple. Frequently deployed as a diagonal 135-degree gradient (`from-[#ff4fd8] to-[#9270ff]`) across high-value hero call-to-actions, active platform tabs, and deep-link verification badges.
- **Brand Strong (`#72ba00`) & Brand Ink (`#172000`)**: Deep moss and dark olive tones provide high-contrast text and border definition against neon lime fills.
- **Neutral Surface & Text (`#15171c`, `#5a625e`)**: Deep obsidian for razor-sharp typography against frosted glass backgrounds.

## Typography

The system uses **DM Sans** exclusively across all levels. Tight negative letter-spacing (`-0.02em` to `-0.065em`) paired with heavy font weights (700 and 800) creates punchy, modern, mobile-first headers that stand out in crowded creator feeds. Body and micro-copy remain legible with neutral letter-spacing and strong semantic colors.

## Layout & Spacing

The layout follows a centered, mobile-first column model with a strict maximum content width of `620px` to maintain the ergonomics of an installed native web app.
- **Outer Padding**: Controlled on mobile by `px-gutter-mobile` (11px / 0.6875rem) expanding slightly on larger devices.
- **Vertical Flow**: Main content cards stack with consistent `gap-space-md` (14px / 0.875rem), ensuring density without visual clutter.
- **Safe Area Insets**: Top app bars use `pt-safe` and bottom navigation bars use `pb-safe` to prevent occlusion on edge-to-edge iOS/Android screens.

## Elevation & Depth

Depth is created through multi-tiered translucent glass layers, delicate inner hairline highlights, and colored ambient glow shadows:
- **Frosted Panels**: Built with `bg-white/80` or `bg-white/85` combined with `backdrop-blur-2xl` and a crisp outline (`border border-white/90` or `border-[#dfe9c7]/80`).
- **Inner Rim Highlights**: Cards feature top-edge light catches using `inset 0 1px 0 rgba(255, 255, 255, 0.9)`.
- **Chroma Shadows**: Rather than sterile grey dropshadows, buttons and focal cards cast colored glow shadows:
  - Primary lime actions: `0 2px 10px rgba(185, 255, 44, 0.5)`
  - Gradient CTA actions: `0 8px 25px rgba(255, 79, 216, 0.45), 0 2px 10px rgba(146, 112, 255, 0.35)`
  - Panel ambient elevation: `0 14px 34px rgba(44, 64, 11, 0.08)`

## Shapes

The system relies on high-curvature **squircle** geometry:
- **Card Containers**: `squircle-card` (18px border radius).
- **Secondary Panels / Floating Bars**: `squircle-panel` (16px border radius).
- **Inputs & Key CTA Buttons**: `squircle-md` (14px border radius) and `squircle-sm` (10px–12px border radius).
- **Badges & Micro Pills**: `rounded-full` (9999px) for status indicators, tag presets, and platform badges.

## Components

### Buttons
- **Hero CTA**: Features a 135-degree gradient from `#ff4fd8` to `#9270ff`, white text (`DM Sans`, font-weight 800), hairline white border (`rgba(255,255,255,0.4)`), and deep colored diffusion shadow.
- **Quick Action Buttons (e.g. Paste / Copy)**: Vibrant lime gradient (`#b9ff2c` to `#a0ea18`), 1px solid `#72ba00` border, and high-contrast dark green text (`#172000`).
- **Platform Selector Pills**: Segmented pill group on a semi-translucent base. Active state uses vibrant gradient fill; inactive state uses subtle grayed typography with soft hover transitions.

### Input Fields & URL Builders
- **URL Inputs**: 48px (`h-12`) height, frosted glass fill (`bg-white/90`), border `#dfe9c7`, with lead icon padding and right-side embedded action buttons. Active focus shifts border to `#72ba00` with an outer ring glow of `primary-container`.
- **Slug Builder Input**: Pre-fixed with static non-editable domain badge (`go.vibe.link/`) styled in brand green, paired with live status feedback icons (`check_circle`).

### Cards & Panels
- **Workspace Cards**: Encased in 18px rounded squircle frosted glass. Contains subtle background radial blur spheres (`blur-xl` and `blur-2xl`) pinned to corners to produce soft localized backlights.
- **List / History Cards**: 16px rounded compact rows featuring platform color avatars, truncated slug text, live analytical counters, and quick mini action buttons.

### Chips & Badges
- **Status Pills**: Compact, pill-shaped tags (`rounded-full`, 11px font size) with subtle solid or translucent borders representing platform origins (Shopee, TikTok, Lazada) and feature boosters (`Direct In-App`, `Auto UTM`).