# Flutter Conversion Master Plan

## Objective

Build a new Flutter app (new folder, new repo) that reproduces the current Man2Man web app behavior and style with backend compatibility unchanged.

## Senior Agent Workstreams

## 1) Product Parity Agent

Mission:
- Lock exact parity scope from existing app behavior.

Deliverables:
- Screen-by-screen parity checklist.
- Text/copy parity map for all dialogs, banners, and buttons.
- State-machine parity for session, invite, map, and meeting-place flows.

Exit criteria:
- No unresolved parity ambiguities before implementation starts.

## 2) Flutter Architecture Agent

Mission:
- Define project architecture for maintainable feature growth.

Deliverables:
- Clean architecture folder structure.
- State strategy (recommended: Riverpod + immutable models).
- Navigation architecture (recommended: `go_router`).
- Error/retry layer and shared result types.

Exit criteria:
- All core features can be implemented without cross-feature coupling.

## 3) Convex Integration Agent

Mission:
- Recreate current Convex HTTP client semantics in Dart.

Deliverables:
- Query/mutation/action client parity (`/api/query`, `/api/mutation`, `/api/action`).
- Retry/backoff and error parsing parity.
- Polling/subscription abstraction parity to existing `subscribeConvexQuery`.

Exit criteria:
- Flutter client can call every endpoint currently used by web app.

## 4) Realtime + Maps Agent

Mission:
- Match map behavior and route/meeting overlays.

Deliverables:
- Provider-switch map architecture (OSM-like + Google).
- Route rendering parity for pair-mode and meeting-place mode.
- Camera mode parity (`auto` vs `manual`) including recenter toggle and persistence.

Exit criteria:
- Route/camera behavior matches existing map screens under movement and stale-network cases.

## 5) UX and Design System Agent

Mission:
- Preserve current visual identity with Flutter-native implementation.

Deliverables:
- Tokenized theme system for dark/light and system-default behavior.
- Component parity for buttons, inputs, drawers, dialogs, chips, bottom sheet, FABs.
- Motion/accessibility parity (`prefers-reduced-motion` equivalent behavior).

Exit criteria:
- Flutter UI snapshot review passes against existing UX language and hierarchy.

## 6) QA and Release Agent

Mission:
- Prevent parity regressions during migration.

Deliverables:
- Widget/integration test plan.
- Manual test matrix for map providers, theme, network, and dual-user sessions.
- Release gates and rollback strategy.

Exit criteria:
- All mandatory parity and reliability gates are green before launch.

## Workstream Dependencies

1. Product parity baseline must be signed first.
2. Architecture and Convex contracts finalize before feature coding.
3. Map and design system proceed in parallel once architecture is fixed.
4. QA test matrix starts before coding and is updated continuously.

## Implementation Phases

## Phase 0: Bootstrap and Contracts

- Create new Flutter repo and baseline CI.
- Implement Convex client and DTOs.
- Implement storage and feature-flag config.

Gate:
- Convex smoke tests and auth/session API calls succeed.

## Phase 1: Core Session Flows

- Onboarding.
- Session home.
- Create/join/list.
- Invite lifecycle dialogs.

Gate:
- Two-user session creation and join flow is stable.

## Phase 2: Realtime Map Core

- Location watch/update loop.
- Partner polling.
- Connection banners and retry states.
- End/leave session behavior.

Gate:
- Session map remains stable during reconnect and terminal states.

## Phase 3: Advanced Map Features

- Meeting-place dialogs and action flows.
- Dual route mode and route chips.
- Map provider switch and auto-recenter toggle.

Gate:
- Meeting-place lifecycle and camera controls match web parity.

## Phase 4: Visual Polish and Hardening

- Theme token parity.
- Animation tuning.
- Accessibility fixes.
- Test automation expansion and production readiness.

Gate:
- QA checklist complete and sign-off approved.

## Risks and Mitigations

Risk:
- Flutter map packages differ in camera and polyline behavior.
Mitigation:
- Introduce provider abstraction layer early and normalize camera semantics in shared controller.

Risk:
- Polling-heavy flows can trigger race conditions.
Mitigation:
- Centralize timers and cancellation with lifecycle-aware controllers.

Risk:
- Silent copy/style drift from existing product language.
Mitigation:
- Lock strings and tokens in parity specs before implementation.

Risk:
- Feature flag drift between environments.
Mitigation:
- Centralize config and document startup flag logs for diagnostics.

## Staffing Recommendation

- 1 lead Flutter engineer (architecture + critical path)
- 1 Flutter engineer (session + invites + onboarding)
- 1 Flutter engineer (maps + realtime + camera/meeting-place)
- 1 QA engineer (automation + manual two-device matrix)
- Optional: 1 designer/UX QA for visual parity sign-off

## Done Criteria

- All parity-critical scenarios pass in `docs/FLUTTER_EXECUTION_QA_CHECKLIST.md`.
- No backend contract changes required.
- Production deployment can run with current backend endpoints and current feature flags.
