# Data Model

## Overview

Fretlog uses five tables. Sessions are the core entity. Songs and techniques are library items that get linked to sessions via join tables. Both songs and techniques support soft-delete so that historical session data is never broken.

## Tables

### `sessions`

A single practice session.

| Column | Type | Notes |
|---|---|---|
| `id` | `SERIAL` | Primary key |
| `date` | `DATE` | Day of practice (not a timestamp) |
| `duration_minutes` | `INTEGER` | Length of the session |
| `notes` | `TEXT` | Free-form notes, optional |
| `reference_url` | `TEXT` | Optional link (e.g. lesson, tab) |
| `created_at` | `TIMESTAMPTZ` | Record creation time |

### `songs`

A reusable library of songs.

| Column | Type | Notes |
|---|---|---|
| `id` | `SERIAL` | Primary key |
| `title` | `TEXT` | Required |
| `artist` | `TEXT` | Optional |
| `reference_url` | `TEXT` | Optional link (e.g. tab, YouTube) |
| `created_at` | `TIMESTAMPTZ` | Record creation time |
| `deleted_at` | `TIMESTAMPTZ` | Soft-delete timestamp; `NULL` means active |

### `techniques`

A reusable library of techniques (e.g. "fingerpicking", "barre chords").

| Column | Type | Notes |
|---|---|---|
| `id` | `SERIAL` | Primary key |
| `name` | `TEXT` | Required |
| `category` | `TEXT` | Optional grouping (e.g. "rhythm", "theory") |
| `reference_url` | `TEXT` | Optional link |
| `created_at` | `TIMESTAMPTZ` | Record creation time |
| `deleted_at` | `TIMESTAMPTZ` | Soft-delete timestamp; `NULL` means active |

### `session_songs`

Join table linking sessions to songs.

| Column | Type | Notes |
|---|---|---|
| `session_id` | `INTEGER` | FK → `sessions(id)`, cascades on session delete |
| `song_id` | `INTEGER` | FK → `songs(id)`, no cascade |

### `session_techniques`

Join table linking sessions to techniques.

| Column | Type | Notes |
|---|---|---|
| `session_id` | `INTEGER` | FK → `sessions(id)`, cascades on session delete |
| `technique_id` | `INTEGER` | FK → `techniques(id)`, no cascade |

## Key Design Decisions

**Soft-delete on songs and techniques** — Setting `deleted_at` hides an item from the library UI without removing it from the database. This preserves `session_songs` and `session_techniques` rows, so historical sessions continue to show the songs and techniques that were practiced.

**Cascade only on session delete** — Deleting a session removes its join rows. Deleting a song or technique does *not* remove join rows, by design.

**`date` is `DATE`, not `TIMESTAMPTZ`** — Sessions record which day you practiced, not the exact moment. This simplifies streak and weekly/monthly aggregation queries.
