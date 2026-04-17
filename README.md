# fretlog

A self-hosted guitar practice tracking app.

Log your practice sessions, track songs and techniques, and see your streaks and weekly/monthly totals — all running locally with a single command.

## Features

- **Live timer** — start a session, stop when done; an overlay collects songs, techniques, notes, and a reference URL before saving
- **Manual quick-log** — enter duration, date, songs, techniques, notes, and a reference URL directly from the dashboard
- **Song & technique library** — reusable library with inline add, edit, and delete; soft-delete preserves historical session data
- **Session history** — paginated list, expand a row to see full detail, edit or delete inline
- **Stats** — practice streak, weekly total, monthly total

## Stack

- **Frontend:** React + Vite + TypeScript
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL
- **Infra:** podman-compose (or docker compose)

## Getting started

**Prerequisites:** Podman + podman-compose (or Docker + Docker Compose)

```bash
git clone https://github.com/your-username/fretlog.git
cd fretlog
cp .env.example .env
podman-compose up
```

The app will be available at `http://localhost:5173`.

## Development

### Running tests

**Frontend** (Vitest + React Testing Library, no database required):

```bash
cd frontend
npm install
npm test          # run once
npm run test:watch  # watch mode
```

**Backend** (Vitest + Supertest against a real Postgres instance on port 5433):

```bash
podman-compose up -d db_test
cd backend
npm install
npm test
npm run test:watch
```

### Project structure

```
fretlog/
├── backend/
│   └── src/
│       ├── app.ts
│       ├── db.ts
│       ├── migrate.ts
│       ├── migrations/
│       ├── routes/
│       └── tests/
├── frontend/
│   └── src/
│       ├── api/          # typed fetch wrappers + shared types
│       ├── components/   # LibraryPicker (combobox)
│       ├── pages/        # Dashboard, SessionForm, History, Library
│       └── utils/        # date formatting helpers
├── docs/
│   └── data-model.md
├── .github/
│   └── workflows/
│       └── ci.yml
├── docker-compose.yml
└── PLAN.md
```

### Useful commands

| Command | Description |
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

## API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/sessions` | List sessions (paginated) |
| POST | `/api/sessions` | Create a session |
| GET | `/api/sessions/stats` | Streak, weekly + monthly totals |
| GET | `/api/sessions/:id` | Get session with songs + techniques |
| PUT | `/api/sessions/:id` | Update a session |
| DELETE | `/api/sessions/:id` | Delete a session |
| POST | `/api/sessions/:id/songs/:songId` | Attach a song to a session |
| DELETE | `/api/sessions/:id/songs/:songId` | Detach a song from a session |
| POST | `/api/sessions/:id/techniques/:techId` | Attach a technique to a session |
| DELETE | `/api/sessions/:id/techniques/:techId` | Detach a technique from a session |
| GET | `/api/songs` | List songs |
| POST | `/api/songs` | Create a song |
| GET | `/api/songs/:id` | Get a song |
| PUT | `/api/songs/:id` | Update a song |
| DELETE | `/api/songs/:id` | Soft-delete a song |
| GET | `/api/techniques` | List techniques |
| POST | `/api/techniques` | Create a technique |
| GET | `/api/techniques/:id` | Get a technique |
| PUT | `/api/techniques/:id` | Update a technique |
| DELETE | `/api/techniques/:id` | Soft-delete a technique |

## Data model

See [docs/data-model.md](docs/data-model.md) for the full schema and design decisions.

## Out of scope for MVP1

- Authentication
- Goals or milestones
- Charts or analytics beyond streak + weekly/monthly totals
- Audio features
