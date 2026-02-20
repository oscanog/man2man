# Flutter Backend Contract (Convex)

Backend is intentionally unchanged. Flutter must integrate with existing Convex HTTP API behavior.

## Transport Contract

Base URL source:
- `VITE_CONVEX_URL` in web app.
- Flutter equivalent should come from build-time config.

HTTP paths:
- `POST /api/query`
- `POST /api/mutation`
- `POST /api/action`

Request shape:

```json
{
  "path": "module:functionName",
  "args": { "key": "value" }
}
```

Response shape:

```json
{
  "status": "success",
  "value": {}
}
```

or

```json
{
  "status": "error",
  "errorMessage": "message",
  "errorData": { "code": "..." }
}
```

## Retry and Error Handling Parity

Web default retry policy:
- Max retries: `3`
- Base delay: `1000ms`
- Max delay: `10000ms`
- Exponential backoff with jitter
- Do not retry on abort

Special per-call overrides in web app:
- Some mutation/action calls use `maxRetries: 0`
- Join and close operations often specify stricter retry behavior

Error normalization to preserve:
- `USERNAME_IN_USE` with `suggestion` is surfaced as `USERNAME_IN_USE:<suggestedName>`
- Unknown payload falls back to message fields

## Endpoint Inventory Used By Frontend

## Users

`users:upsert` (mutation)
- args: `{ deviceId, username }`
- returns: user object with `_id`, `username`, etc.

`users:getByDevice` (query)
- args: `{ deviceId }`

`users:heartbeat` (mutation)
- args: `{ deviceId }`

`users:setOffline` (mutation)
- args: `{ deviceId }`

`users:getOnlineUsers` (query via polling subscription)
- args: `{}`

## Sessions

`locationSessions:create` (mutation)
- args: `{ userId }`
- returns: `{ sessionId, code }`

`locationSessions:join` (mutation)
- args: `{ code, userId }`
- returns: `{ sessionId, joined }`

`locationSessions:get` (query)
- args: `{ sessionId }`

`locationSessions:getParticipantState` (query)
- args: `{ sessionId, userId }`
- returns fields like: `exists`, `status`, `isParticipant`, `role`, `canSendLocation`

`locationSessions:hasPartnerJoined` (query)
- args: `{ sessionId }`
- returns state model including `joined` and `state`

`locationSessions:getAllActive` (query)
- args: `{}`

`locationSessions:getActiveForUser` (query)
- args: `{ userId }`

`locationSessions:close` (mutation)
- args: `{ sessionId, userId }`

## Locations

`locations:update` (mutation)
- args: `{ sessionId, userId, lat, lng, accuracy }`

`locations:getPartnerLocation` (query)
- args: `{ sessionId, userId }`

## Invites

`invites:send` (mutation)
- args: `{ requesterId, recipientId }`

`invites:respond` (mutation)
- args: `{ inviteId, userId, accept }`

`invites:cancel` (mutation)
- args: `{ inviteId, userId }`

`invites:getIncomingPendingForUser` (query via polling subscription)
- args: `{ userId }`

`invites:getLatestOutgoingForUser` (query via polling subscription)
- args: `{ userId }`

## Routes

Current primary:
- `routes:getForSessionRoutes` (query)
- `routes:recomputeFastestRoad` (action)

Legacy still present in codebase:
- `routes:getForSession` (query via old hook)

## Meeting Place

`meetingPlaces:getForSession` (query)
- args: `{ sessionId, userId }`

`meetingPlaces:setMeetingPlace` (mutation)
- args: `{ sessionId, userId, place }`

`meetingPlaces:requestRemoval` (mutation)
- args: `{ sessionId, userId }`

`meetingPlaces:respondRemoval` (mutation)
- args: `{ sessionId, userId, accept }`

`meetingPlaces:searchSuggestions` (action)
- args: `{ sessionId, userId, query, limit }`

## Polling and Cadence Parity

`usePresenceHeartbeat`
- interval: `30000ms`
- triggers also on window focus and visibility return.

`useOnlineUsers`
- polling interval: `3000ms`

`useSessionInvites`
- incoming polling interval: `2000ms`
- outgoing polling interval: `2000ms`

`CreateSessionScreen`
- poll `hasPartnerJoined`: `2000ms`
- send own location while waiting: every `5000ms`

`JoinSessionScreen`
- verification poll interval: `800ms`
- verification timeout: `5000ms`
- max attempts: `5`

`RealtimeMapScreen`
- main update loop interval: `2000ms`
- location update retry max: `3` attempts with exponential backoff base `800ms`

`useMeetingPlace`
- poll interval: `2500ms`

`useMeetingRoutes`
- poll interval: `3000ms`
- recompute min interval: `12000ms`
- movement trigger: `25m`
- moving-state threshold: `3m`
- moving hold time: `10000ms`

`useMeetingPlaceSearch`
- debounce: `350ms`
- min chars: `2`
- max results default: `8`
- cache TTL: `45000ms`
- abort previous in-flight request on new query

## Local Persistence Contract

Auth keys (local storage):
- `man2man_device_id`
- `man2man_username`
- `man2man_user_id`

Map preference keys:
- `man2man_map_mode_<userId|anonymous>`
- `man2man_map_camera_mode_<userId|anonymous>`

Join handoff (session storage equivalent):
- key: `man2man_pending_join_handoff`
- ttl: `45000ms`

## Feature Flags

Current frontend flags:
- `VITE_FEATURE_LIVE_ROUTE` (default false)
- `VITE_FEATURE_MEETING_PLACE` (default false)

Flutter recommendation:
- Use `--dart-define` and wrap in typed config.
- Keep defaults aligned with existing web env behavior.

## Flutter Implementation Notes

- Build a small `ConvexClient` with three methods:
  - `query(path, args)`
  - `mutation(path, args)`
  - `action(path, args)`
- Keep retry policies configurable per call.
- Implement polling subscriptions as cancellable timers + request dedupe guards.
- Keep error mapping logic centralized so UI messages remain consistent.
