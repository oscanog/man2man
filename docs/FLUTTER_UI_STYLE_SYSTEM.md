# Flutter UI Style System (Parity Guide)

This file maps the existing web design system to Flutter. The goal is visual equivalence, not reinterpretation.

## Design Direction

- Mobile-first.
- High contrast, dark-navy default canvas.
- Accent-forward actions with rose primary.
- Glass/blur overlays for map controls, chips, and modals.
- Low visual noise for secondary floating controls.

## Core Tokens

## Brand and semantic

- `colorRose`: `#FF035B`
- `colorRoseLight`: `#FF2B75`
- `colorRoseDark`: `#D6004A`
- `colorNavyBg`: `#0A1628`
- `colorNavySurface`: `#141D2B`
- `colorNavyElevated`: `#1E2837`
- `colorSuccess`: `#00C853`
- `colorWarning`: `#FFB300`
- `colorError`: `#FF1744`

## Typography scale

- `textXs`: `12`
- `textSm`: `14`
- `textBase`: `16`
- `textLg`: `18`
- `textXl`: `20`
- `text2xl`: `24`
- `text3xl`: `30`

## Spacing scale

- `space1`: `4`
- `space2`: `8`
- `space3`: `12`
- `space4`: `16`
- `space5`: `20`
- `space6`: `24`
- `space8`: `32`
- `space10`: `40`
- `space12`: `48`

## Radius scale

- `radiusSm`: `8`
- `radiusMd`: `12`
- `radiusLg`: `16`
- `radiusXl`: `20`
- `radiusFull`: `9999`

## Touch targets

- `touchMin`: `56`
- `touchComfortable`: `48`

## Theme Tokens (Dark/Light)

Implement `ThemeExtension` or equivalent with explicit token sets:

- Drawer tokens
- Modal tokens
- Bottom sheet tokens
- Onboarding suggestion tokens
- Route line/chip tokens
- Meeting-place tokens
- Camera FAB tokens

Critical parity tokens for meeting/camera controls:

Dark:
- meeting FAB bg `rgba(15,26,45,0.62)`
- meeting FAB border `rgba(255,255,255,0.26)`
- meeting FAB text `#f8fafc`
- camera FAB bg `rgba(15,26,45,0.45)`
- camera FAB border `rgba(255,255,255,0.24)`
- camera FAB active bg `rgba(0,212,255,0.22)`

Light:
- meeting FAB bg `rgba(248,251,255,0.76)`
- meeting FAB border `rgba(15,23,42,0.2)`
- meeting FAB text `#0f172a`
- camera FAB bg `rgba(248,251,255,0.7)`
- camera FAB border `rgba(15,23,42,0.2)`
- camera FAB active bg `rgba(0,120,255,0.14)`

## Component Parity Specs

## Buttons

Variants:
- `primary`
- `secondary`
- `tertiary`
- `ghost`
- `danger`

Sizes:
- `sm`: min height 44
- `md`: min height 56
- `lg`: min height 64

Behavior:
- subtle scale down on tap (`active:scale(0.98)` equivalent)
- clear focus state for keyboard/desktop
- loading state with spinner and disabled interaction

## Inputs

- dark surface by default in current app style.
- rounded corners (`12`).
- icons left/right and password toggle support.
- error border and helper text support.
- preserve 6-cell join code input visual style in join screen.

## Dialogs

- full-screen scrim with smooth fade.
- rounded panel (`~24-28` effective visual).
- low-noise transition (`~250ms`).
- close button in top-right for cancellable dialogs.
- same title and body hierarchy as existing modals.

## Online Users Drawer

- left-side slide panel.
- backdrop tap-to-close guard.
- keyboard escape/back close behavior.
- animated row reveal with slight stagger.

## Bottom Sheet (Create Session)

- draggable with peek height behavior.
- top grab handle and sticky collapsed summary.
- dynamic elapsed timer (`Created Xm Ys ago`).

## Chips

- route info chip:
  - rounded pill
  - blurred glass background
  - label + value hierarchy
- status chips for meeting removal states:
  - compact pill with themed accent border/background.

## Floating Buttons

Set Meetup FAB:
- low opacity by default.
- hover/focus increase opacity.
- blurred glass, subtle shadow.

Camera FAB:
- low opacity idle.
- strong active visual when auto mode on.
- focus ring uses brand focus token.

Map-provider switch FAB:
- side-centered control.
- low-opacity style consistent with map overlays.

## Motion and Interaction

Match key timing constants:
- map layer provider switch animation: `320ms`
- dialog transitions: `250ms`
- transient notice duration: `2600ms`

Reduced motion behavior:
- disable non-critical animation when OS requests reduced motion.

## Safe Area and Layout

- enforce top/bottom/left/right safe insets.
- keep content max width equivalent to current shell (`~430px` centered).
- map overlays should avoid unsafe bottom inset and avoid overlap collisions:
  - provider switch (side center)
  - camera toggle (bottom-left)
  - set meetup (bottom-right)
  - bottom CTA bar

## Accessibility Requirements

- preserve focus-visible rings.
- preserve minimum touch targets.
- keep readable contrast in both themes.
- all icon-only buttons require semantic labels.
- dialogs use proper modal semantics and trap focus where applicable.

## Copy and Tone

Keep existing labels and message style unless explicitly approved:
- concise, action-first wording.
- same session/map terms and status language.
