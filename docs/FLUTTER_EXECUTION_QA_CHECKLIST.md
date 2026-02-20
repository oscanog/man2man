# Flutter Execution and QA Checklist

This document is the implementation runbook for building the new Flutter repo and releasing safely.

## New Repo Bootstrap

Suggested folder:
- `c:/man2man-flutter`

Suggested steps:

1. Create repo and initialize Flutter app.
2. Set up CI for format, analyze, tests.
3. Add environment config support for Convex URL and feature flags.

Example bootstrap commands:

```bash
mkdir c:/man2man-flutter
cd c:/man2man-flutter
git init
flutter create .
```

## Recommended Initial Dependencies

Core:
- `flutter_riverpod`
- `go_router`
- `dio`
- `freezed_annotation`
- `json_annotation`
- `equatable` (optional if not using freezed everywhere)

Maps:
- `flutter_map` (OSM/Leaflet equivalent)
- `google_maps_flutter`
- `latlong2`

Location/storage:
- `geolocator`
- `permission_handler`
- `shared_preferences`

Utilities:
- `collection`
- `logger`
- `intl` (for formatting)

Dev:
- `build_runner`
- `freezed`
- `json_serializable`
- `flutter_lints`

## Suggested Flutter Project Structure

```text
lib/
  app/
    app.dart
    router.dart
    theme/
      tokens.dart
      app_theme.dart
      app_theme_extensions.dart
  core/
    config/
    errors/
    network/
      convex_client.dart
      retry_policy.dart
    storage/
  features/
    onboarding/
    session/
      create/
      join/
      list/
      invites/
    map/
      presentation/
      domain/
      data/
      widgets/
      providers/
    meeting_place/
  shared/
    widgets/
    models/
    utils/
```

## Execution Plan

## Milestone 1: Foundation

- Implement Convex client (`query`, `mutation`, `action`).
- Implement retry/error mapper parity.
- Implement local storage keys and join-handoff storage.
- Implement feature-flag config.

Done when:
- Basic API smoke tests pass.

## Milestone 2: Session Flows

- Onboarding and username handling.
- Session home/create/join/list screens.
- Invite dialogs and state handling.

Done when:
- Two devices can create, join, and handle invites end-to-end.

## Milestone 3: Realtime Map

- Geolocation watch and periodic updates.
- Session poll loop and terminal-state exits.
- Connection status banners and retry logic.
- End/leave session actions.

Done when:
- Map remains stable through reconnect and transient failures.

## Milestone 4: Advanced Map and Meeting Place

- Meeting-place search, confirm, request-remove, decision dialogs.
- Dual route modes and route chips.
- Provider switch and camera toggle parity.

Done when:
- Meeting-place and camera behavior match existing web logic.

## Milestone 5: Visual and Accessibility Hardening

- Full token parity for dark/light/system mode.
- Motion/reduced-motion parity.
- Accessibility sweeps and layout safe-area checks.

Done when:
- QA sign-off matrix is fully green.

## QA Strategy

## Unit tests

- Convex error parser and retry policy.
- Storage key contracts and preference parsing.
- Meeting search debounce/cache/abort behavior.
- Route movement trigger calculations.

## Widget tests

- Onboarding username flow.
- Join 6-char code auto-submit and modal states.
- Invite dialog transitions.
- Meeting place dialog decision flows.
- Map control button visibility rules.

## Integration tests (multi-device scenarios)

- Host creates session, guest joins by code.
- Invite send/respond/cancel with real backend staging environment.
- Partner disconnect/reconnect behavior.
- Meeting-place set, removal request, accept/decline.
- Camera toggle persistence across app restart.

## Manual Test Matrix

Map providers:
- OSM-like mode.
- Google mode.

Themes:
- dark.
- light.
- system default.

Network:
- healthy.
- high latency.
- intermittent connectivity.
- offline and recover.

Session states:
- waiting for partner.
- active with both users moving.
- one user exits session.
- session closed or expired.

Meeting place:
- no place set.
- set place.
- removal requested by self.
- removal requested by partner.

## Release Gates

Gate 1:
- All high-priority parity cases pass.

Gate 2:
- Crash-free smoke testing on Android and iOS physical devices.

Gate 3:
- Backend call volume and timing validated against expected polling cadence.

Gate 4:
- Product/UX sign-off confirms same flow and style as current app.

## Cutover Plan

1. Keep existing web app live while Flutter app stabilizes.
2. Release Flutter build to internal testers first.
3. Compare behavior logs and manual parity checklist.
4. Roll out progressively once parity and reliability pass.
5. Keep rollback path to previous stable mobile build.
