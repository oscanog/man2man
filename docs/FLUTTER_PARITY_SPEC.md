# Flutter Parity Specification

This document defines exact product behavior that Flutter must preserve.

## Route To Screen Mapping

Web route:
- `/`
Flutter screen:
- `OnboardingScreen`
Purpose:
- Create or restore local identity and move to session hub.

Web route:
- `/session`
Flutter screen:
- `SessionHomeScreen`
Purpose:
- Entry hub to create, join, or list sessions.

Web route:
- `/session/create`
Flutter screen:
- `CreateSessionScreen`
Purpose:
- Host session generation, share code, wait for partner.

Web route:
- `/session/join`
Flutter screen:
- `JoinSessionScreen`
Purpose:
- Join with 6-char code, including shared-link bootstrap flow.

Web route:
- `/session/list`
Flutter screen:
- `SessionListScreen`
Purpose:
- Browse and join active sessions.

Web route:
- `/map/:sessionId`
Flutter screen:
- `RealtimeMapScreen`
Purpose:
- Active session map, invites, meeting-place flow, map controls.

## Core State Machines

## Identity and onboarding

State:
- `unauthenticated`
Transition:
- user submits username -> `users:upsert` success -> `authenticated`

State:
- `authenticated`
Transition:
- auto-redirect to session hub.

## Create-session flow

State:
- `idle`
Transition:
- tap create -> `locationSessions:create` -> `waiting_for_partner`

State:
- `waiting_for_partner`
Transition:
- poll `locationSessions:hasPartnerJoined` every 2s.

State:
- `partner_joined`
Transition:
- navigate to map screen.

Terminal states:
- `expired`, `missing`, `closed` from backend should redirect to session hub.

## Join-session flow

State:
- `code_entry`
Transition:
- enter 6 chars -> join.

State:
- `joining`
Transition:
- `locationSessions:join` success -> `verifying`.

State:
- `verifying`
Transition:
- poll `locationSessions:getParticipantState` until active participant.

State:
- `joined`
Transition:
- navigate to map.

Auto-identity bootstrap behavior:
- Shared-link join may auto-create guest username.
- Show username confirmation modal before final join continuation.

## Map-session flow

State:
- `connected`
Transition:
- periodic updates succeed.

State:
- `reconnecting`
Transition:
- transient location update failures.

State:
- `disconnected`
Transition:
- consecutive update failures.

Recovery:
- manual retry path must revalidate participant state and refresh session data.

Terminal exits:
- session closed/missing.
- user no longer participant.

## Invite flow

Outgoing:
- send invite -> pending dialog -> accepted/declined/cancelled.

Incoming:
- show modal -> accept or decline.

Special:
- if already connected to selected user, show `Already connected` dialog.
- if connected to another partner, show `Leave current session?` confirmation before sending new invite.

## Meeting-place state machine

State:
- `none`
Transition:
- set place -> `set`

State:
- `set`
Transition:
- request removal -> `removal_requested`

State:
- `removal_requested`
Transition:
- partner accepts -> `none`
- partner rejects -> `set`

Behavior requirements:
- Set meetup CTA appears only when meeting-place flag is enabled and partner is connected.
- If place already set, tapping CTA opens removal-request flow.
- If partner requests removal, decision dialog auto-opens.
- While waiting for response to own request, CTA is disabled and waiting chip is shown.

## Realtime Map Parity Requirements

## Map provider behavior

- Support two providers:
  - OSM/Leaflet equivalent.
  - Google map equivalent.
- Map mode preference is persisted per user.
- Provider switch uses horizontal slide animation (~320ms).

## Camera behavior

- `auto` mode:
  - fit active route or user markers periodically.
- `manual` mode:
  - stop auto-fit snapping while continuing to update markers/routes.
- Auto recenter toggle:
  - low-opacity floating button.
  - visible only when partner connected.
  - persisted per user.
  - toggling back to auto triggers immediate fit.

## Route rendering

- Pair mode:
  - single route between users.
- Meeting-place mode:
  - route for each user toward meeting place.
- Chip logic:
  - meeting mode chip shows both ETAs/distances when available.
  - pair mode chip shows fastest road ETA/distance.
  - fallback chip shows direct distance when no route available.

## Overlay and control parity

- Top bar includes session code and connection status.
- Waiting/connection banners align with backend/session state.
- Bottom control keeps primary action:
  - host: `End Session`
  - guest: `Leave Session`
- Online users drawer accessible from top-left menu button.
- Set Meetup FAB bottom-right with low visual noise style.
- Camera toggle FAB bottom-left.
- Map provider switch FAB at side center.

## Copy Parity (Do Not Rewrite Without Product Approval)

Examples that must remain equivalent:
- `Create Session`
- `Join Session`
- `Waiting for partner...`
- `Partner connected!`
- `Set Meetup`
- `Meeting place already set`
- `Removal requested`
- `Connection lost`
- `Reconnecting...`
- `Retry`

## Timing and Interaction Parity

- Polling and retry intervals must match backend contract doc.
- Dialog entrance/exit should remain subtle and quick.
- Drag bottom-sheet should preserve current feel:
  - peek area, swipe thresholds, and sticky behavior.
- Respect reduced-motion user settings by disabling non-essential animations.

## Accessibility Parity

- Maintain focus-visible affordances.
- Preserve minimum comfortable touch targets.
- Ensure sufficient color contrast in both dark and light variants.
- Keep dialog semantics and keyboard/back button close behaviors.
