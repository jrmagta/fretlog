# fretlog

A self-hosted guitar practice tracking app.

Log your practice sessions, track songs and techniques, and see your streaks and weekly/monthly totals — all running locally with a single command.

## Stack

- **Frontend:** React + Vite + TypeScript
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL
- **Infra:** podman-compose (or docker compose)
- **Docs:** MkDocs Material → GitHub Pages

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

Tests run against a real Postgres instance on port 5433. Make sure `db_test` is up first:

```bash
podman-compose up -d db_test
cd backend
npm install
npm test          # run once
npm run test:watch  # watch mode
```

### Project structure

```
fretlog/
├── backend/          # Express API (TypeScript)
│   └── src/
│       ├── app.ts
│       ├── db.ts
│       ├── migrate.ts
│       ├── migrations/
│       ├── routes/
│       └── tests/
├── frontend/         # React + Vite (coming soon)
├── docs/             # MkDocs source
├── docker-compose.yml
└── PLAN.md
```

### Useful commands

| Command | Description |
|---|---|
| `podman-compose up` | Start everything |
| `podman-compose up -d db_test` | Start the test DB |
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
