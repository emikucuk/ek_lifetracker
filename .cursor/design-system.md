# Design System (portable)

Default brand from EK Watchlist. Retheme by changing tokens; keep structure.

## Brand

| Token | Hex | Use |
|-------|-----|-----|
| Jungle | `#1A4731` | Primary brand, text on cream |
| Cream | `#FFF4CC` | Accent surfaces, CTAs |
| Ink | `#0F2A1C` | Body text |
| Muted | `#5C7A6B` | Secondary text |
| Line | `#D0E4D9` | Borders |

## Typography

- Headings: `Outfit`
- Body: `Manrope`
- Tracking scale via CSS vars (`--tracking-tight`, etc.)

## Surfaces

- App: light canvas + soft radial washes (not flat gray)
- Cards / panels: white, soft border, ~22px radius, light shadow
- Dev panel only: dark terminal theme (see `dev-panel-design.md`)

## UI rules

- One composition per viewport section
- Cards for interactive collections, not decorative chrome
- Prefer outline/ghost buttons; cream for primary CTA
- Status colors semantic and consistent
- Mobile: bottom nav instead of hamburger when applicable

## Component patterns to reuse

- `Field` + `FieldInput` / `FieldSelect` / `FieldTextarea` / `FieldStepper`
- `DeleteConfirmButton` (anchor bubble)
- `CompactSelect` / `CompactMultiSelect`
- `AppShell` sidebar + mobile bottom bar
