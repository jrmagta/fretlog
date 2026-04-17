# Fretlog

A self-hosted guitar practice tracking app. Log your sessions, build a library of songs and techniques, and track your streak and practice totals — all running locally with a single command.

## Getting started

**Prerequisites:** Podman + podman-compose (or Docker + Docker Compose)

```bash
git clone https://github.com/jrmagta/fretlog.git
cd fretlog
cp .env.example .env
podman-compose up
```

Open `http://localhost:5173`.

## Features

**Dashboard**

- Live timer — start a session, press End Session, fill in songs/techniques/notes in an overlay before saving
- Manual quick-log — enter date, duration, songs, techniques, notes, and a reference URL directly from the dashboard
- Streak counter and weekly/monthly practice totals

**Session history**

- Paginated list of all sessions
- Expand a row to see songs, techniques, notes, and reference link inline
- Edit or delete any session

**Song & technique library**

- Shared library used across all entry points
- Inline add, edit, and delete
- Soft-delete: removing an item hides it from the library but preserves it in historical sessions

## Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL |
| Infra | podman-compose |

## Development

### Running tests

**Frontend** (Vitest + React Testing Library — no database required):

```bash
cd frontend
npm install
npm test
```

**Backend** (Vitest + Supertest against a real Postgres on port 5433):

```bash
podman-compose up -d db_test
cd backend
npm install
npm test
```

### Useful commands

| Command | What it does |
|---|---|
| `podman-compose up` | Start everything |
| `podman-compose up -d db_test` | Start the test DB only |
| `podman-compose down` | Stop all services |
| `podman-compose up --build` | Rebuild after dependency changes |

### Reset the database

```bash
podman-compose exec db psql -U fretlog -d fretlog -c \
  "TRUNCATE sessions, session_songs, session_techniques, songs, techniques RESTART IDENTITY CASCADE;"
```
