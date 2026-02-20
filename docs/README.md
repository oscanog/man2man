# Man2Man Flutter Conversion Docs

This folder is the complete migration blueprint for rebuilding the current TanStack web app as a new Flutter app in a new repository, while preserving the same product behavior, flow, and visual style.

## Scope

- Rebuild frontend only in Flutter.
- Keep existing Convex backend as-is.
- Maintain current user journeys and UI language.
- Keep feature-flag behavior (`live route`, `meeting place`) aligned.

## Non-goals

- No backend schema/function redesign.
- No product redesign or flow simplification.
- No silent UX copy changes.

## Read Order

1. `docs/FLUTTER_CONVERSION_MASTER_PLAN.md`
2. `docs/FLUTTER_ARCHITECTURE_BLUEPRINT.md`
3. `docs/FLUTTER_PARITY_SPEC.md`
4. `docs/FLUTTER_BACKEND_CONTRACTS.md`
5. `docs/FLUTTER_UI_STYLE_SYSTEM.md`
6. `docs/FLUTTER_EXECUTION_QA_CHECKLIST.md`

## Parity Baseline

All parity requirements in these docs are derived from the current web implementation in:

- `app/routes/index.tsx`
- `app/routes/session.tsx`
- `app/routes/session/create.tsx`
- `app/routes/session/join.tsx`
- `app/routes/session/list.tsx`
- `app/routes/map.$sessionId.tsx`
- `app/components/map/MapSwitcher.tsx`
- `app/components/map/providers/LeafletMap.tsx`
- `app/components/map/providers/GoogleMap.tsx`
- `app/components/modals/SessionInviteDialogs.tsx`
- `app/components/modals/MeetingPlaceDialogs.tsx`
- `app/styles/styles.css`

## Definition Of Success

The Flutter app is successful only when a tester can execute the existing web flow end-to-end and observe equivalent behavior, timing, and styling decisions without backend changes.
