# Fretlog

A self-hosted guitar practice tracking app.

## Stack
- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express
- Database: PostgreSQL
- Infra: Docker Compose
- Docs: MkDocs Material (deployed to GitHub Pages via GitHub Actions)

## Data Model
- Sessions (id, date, duration_minutes, notes, reference_url, created_at)
- Songs (id, title, artist, reference_url, created_at)
- Techniques (id, name, category, reference_url, created_at)
- Session_Songs (session_id, song_id)
- Session_Techniques (session_id, technique_id)

## Features
- Dashboard: live timer quick-start, recent sessions list, weekly/monthly
  practice totals, streak tracking
- Session logging: live mode (timer) and manual entry mode
- Session fields: date, duration, songs, techniques, notes, reference URL
- Songs/techniques come from a reusable library with inline creation
- Session history: paginated list, expand to full detail, edit and delete
- Song & Technique library: add, edit, delete (deleting preserves
  historical session data)

## Out of scope for MVP1
- Authentication
- Goals or milestones
- Charts or analytics beyond streak + weekly/monthly totals
- Audio features

## Development conventions
- Do not create any files without explicit approval
- Update /docs when adding or changing features
- Keep docker compose up as the single command to run everything
```

Then start your planning session with just:
```
Please review CLAUDE.md and then:
1. Propose the full project folder structure
2. Identify all Docker Compose services and how they connect
3. List all REST API endpoints needed
4. Highlight any technical decisions or potential pitfalls
5. Suggest an implementation order that lets me test and see progress early

Do not create any files yet.