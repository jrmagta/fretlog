# API Reference

All endpoints are prefixed with `/api`. The backend runs on port 3000; the Vite dev server proxies `/api` to it so the frontend uses relative paths.

## Health

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Returns `{ ok: true }` and verifies DB connectivity |

## Sessions

| Method | Path | Description |
|---|---|---|
| GET | `/api/sessions` | List sessions, paginated |
| POST | `/api/sessions` | Create a session |
| GET | `/api/sessions/stats` | Streak, weekly total, monthly total |
| GET | `/api/sessions/:id` | Get a session with linked songs + techniques |
| PUT | `/api/sessions/:id` | Update a session |
| DELETE | `/api/sessions/:id` | Delete a session (cascades join rows) |

### `GET /api/sessions`

Query parameters:

| Parameter | Default | Description |
|---|---|---|
| `limit` | 20 | Max records to return |
| `offset` | 0 | Number of records to skip |

Response:

```json
{
  "data": [ /* Session objects */ ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

### `GET /api/sessions/stats`

!!! note
    This route is registered **before** `GET /api/sessions/:id` so Express does not treat `stats` as an ID.

Response:

```json
{
  "streak_days": 5,
  "week_minutes": 180,
  "month_minutes": 720
}
```

The streak resets if the most recent session is not from today or yesterday.

### Session object

```json
{
  "id": 1,
  "date": "2026-04-17",
  "duration_minutes": 45,
  "notes": "Worked on barre chords",
  "reference_url": "https://example.com/lesson",
  "created_at": "2026-04-17T10:00:00.000Z",
  "songs": [
    { "id": 1, "title": "Blackbird", "artist": "The Beatles", "reference_url": null, "created_at": "..." }
  ],
  "techniques": [
    { "id": 2, "name": "Fingerpicking", "category": "right hand", "reference_url": null, "created_at": "..." }
  ]
}
```

`songs` and `techniques` are only included on `GET /api/sessions/:id`.

## Session ↔ Song/Technique attachments

| Method | Path | Description |
|---|---|---|
| POST | `/api/sessions/:id/songs/:songId` | Attach a song to a session (idempotent) |
| DELETE | `/api/sessions/:id/songs/:songId` | Detach a song from a session |
| POST | `/api/sessions/:id/techniques/:techId` | Attach a technique to a session (idempotent) |
| DELETE | `/api/sessions/:id/techniques/:techId` | Detach a technique from a session |

Duplicate attaches use `ON CONFLICT DO NOTHING` — safe to call multiple times.

## Songs

| Method | Path | Description |
|---|---|---|
| GET | `/api/songs` | List active (non-deleted) songs |
| POST | `/api/songs` | Create a song |
| GET | `/api/songs/:id` | Get a song |
| PUT | `/api/songs/:id` | Update a song |
| DELETE | `/api/songs/:id` | Soft-delete a song |

### Song object

```json
{
  "id": 1,
  "title": "Blackbird",
  "artist": "The Beatles",
  "reference_url": "https://example.com/tab",
  "created_at": "2026-04-01T00:00:00.000Z"
}
```

`POST /api/songs` body: `{ "title": "...", "artist": "...", "reference_url": "..." }` — only `title` is required.

Soft-delete sets `deleted_at`; the row is excluded from list/get responses but join rows in `session_songs` are preserved.

## Techniques

| Method | Path | Description |
|---|---|---|
| GET | `/api/techniques` | List active (non-deleted) techniques |
| POST | `/api/techniques` | Create a technique |
| GET | `/api/techniques/:id` | Get a technique |
| PUT | `/api/techniques/:id` | Update a technique |
| DELETE | `/api/techniques/:id` | Soft-delete a technique |

### Technique object

```json
{
  "id": 2,
  "name": "Fingerpicking",
  "category": "right hand",
  "reference_url": null,
  "created_at": "2026-04-01T00:00:00.000Z"
}
```

`POST /api/techniques` body: `{ "name": "...", "category": "...", "reference_url": "..." }` — only `name` is required.
