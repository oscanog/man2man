# Flutter Architecture Blueprint (1:1 Migration Map)

This blueprint maps current web modules to Flutter equivalents so implementation is deterministic.

## Architectural Principles

- Keep domain boundaries by feature, not by widget type only.
- Keep backend endpoints and payload semantics unchanged.
- Keep timing behavior explicit in controller/service layers.
- Keep visual tokens centralized and strongly typed.

## Web To Flutter Mapping

## Routing and shell

Web:
- `app/routes/__root.tsx`
Flutter:
- `app/app.dart`, `app/router.dart`, root scaffold with max-width container.

Web:
- file-based TanStack routes.
Flutter:
- typed `go_router` route map with route names and args.

## Storage and identity

Web:
- `app/lib/storage.ts`
Flutter:
- `core/storage/auth_storage.dart`
- keep keys unchanged for parity where relevant.

Web:
- `app/lib/joinHandoff.ts`
Flutter:
- `core/storage/join_handoff_storage.dart` with TTL `45s`.

## Network and Convex client

Web:
- `app/lib/convex.ts`
Flutter:
- `core/network/convex_client.dart`
- `core/network/retry_policy.dart`
- `core/errors/convex_error_mapper.dart`

## Session flows

Web:
- `app/routes/index.tsx`
Flutter:
- `features/onboarding/presentation/onboarding_screen.dart`
- `features/onboarding/application/onboarding_controller.dart`

Web:
- `app/routes/session/index.tsx`
Flutter:
- `features/session/home/presentation/session_home_screen.dart`

Web:
- `app/routes/session/create.tsx`
Flutter:
- `features/session/create/presentation/create_session_screen.dart`
- `features/session/create/application/create_session_controller.dart`

Web:
- `app/routes/session/join.tsx`
Flutter:
- `features/session/join/presentation/join_session_screen.dart`
- `features/session/join/application/join_session_controller.dart`

Web:
- `app/routes/session/list.tsx`
Flutter:
- `features/session/list/presentation/session_list_screen.dart`

## Invites and online users

Web:
- `app/hooks/useSessionInvites.ts`
Flutter:
- `features/session/invites/application/invites_controller.dart`
- `features/session/invites/data/invites_repository.dart`

Web:
- `app/components/sidebar/OnlineUsersDrawer.tsx`
Flutter:
- `features/session/online_users/presentation/online_users_drawer.dart`

Web:
- `app/hooks/useOnlineUsers.ts`
Flutter:
- `features/session/online_users/application/online_users_controller.dart`

## Realtime map

Web:
- `app/routes/map.$sessionId.tsx`
Flutter:
- `features/map/presentation/realtime_map_screen.dart`
- `features/map/application/realtime_map_controller.dart`

Web:
- `app/components/map/MapSwitcher.tsx`
Flutter:
- `features/map/presentation/widgets/map_switcher.dart`
- shared `MapProviderMode` and `CameraMode` state.

Web:
- `app/components/map/providers/LeafletMap.tsx`
- `app/components/map/providers/GoogleMap.tsx`
Flutter:
- `features/map/providers/osm_map_provider.dart`
- `features/map/providers/google_map_provider.dart`

Web:
- `app/hooks/useMapModePreference.ts`
- `app/hooks/useMapCameraPreference.ts`
Flutter:
- `features/map/application/map_preferences_controller.dart`

## Routes and meeting place domain

Web:
- `app/hooks/useMeetingRoutes.ts`
Flutter:
- `features/map/application/meeting_routes_controller.dart`
- `features/map/data/routes_repository.dart`

Web:
- `app/hooks/useMeetingPlace.ts`
- `app/hooks/useMeetingPlaceSearch.ts`
Flutter:
- `features/meeting_place/application/meeting_place_controller.dart`
- `features/meeting_place/application/meeting_place_search_controller.dart`

Web:
- `app/components/modals/MeetingPlaceDialogs.tsx`
Flutter:
- `features/meeting_place/presentation/dialogs/*.dart`

## Design system

Web:
- `app/styles/styles.css`
- `app/components/ui/Button.tsx`
- `app/components/ui/Input.tsx`
Flutter:
- `app/theme/tokens.dart`
- `app/theme/app_theme.dart`
- `shared/widgets/app_button.dart`
- `shared/widgets/app_input.dart`
- `shared/widgets/dialog_shell.dart`

## State Management Blueprint

Recommended:
- Riverpod `Notifier` or `AsyncNotifier` per feature controller.
- Immutable state models.
- Repository interfaces for API-facing operations.

Controller responsibilities:
- Own timers/pollers.
- Own cancellation and in-flight guards.
- Convert backend responses into UI state.

Widget responsibilities:
- Render state only.
- Trigger controller intents.
- No direct API calls.

## Data Model Blueprint

Use generated immutable models for:
- User
- Session
- Invite
- ParticipantState
- Location
- RouteSnapshot and RoutePath
- MeetingPlace and MeetingPlaceState

Map transformation layer:
- API DTO -> domain model -> UI model.

## Timer and Lifecycle Blueprint

Centralize periodic tasks in controllers:
- Session poll loops.
- Heartbeats.
- Invite polling.
- Meeting place polling.
- Route polling and recompute gating.

Controller lifecycle hooks:
- start on screen enter.
- pause or stop on dispose.
- restart safely on resume where needed.

## Suggested Package Boundaries

`core`:
- pure infrastructure and shared policies.

`features`:
- domain logic and screen-specific controllers.

`shared`:
- reusable UI widgets and generic helpers.

## Implementation Rule

If Flutter behavior conflicts with current web behavior, web behavior is authoritative unless product explicitly approves a change.
