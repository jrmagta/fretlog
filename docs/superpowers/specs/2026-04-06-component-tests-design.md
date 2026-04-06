# Frontend Component Tests — Design Spec

**Date:** 2026-04-06  
**Scope:** Thorough Vitest + React Testing Library tests for `LibraryPicker`, `Dashboard`, and `SessionForm`

---

## Approach

Four test files, splitting `SessionForm` by mode (create vs. edit) for clean isolation:

- `src/components/LibraryPicker.test.tsx`
- `src/pages/Dashboard.test.tsx`
- `src/pages/SessionForm.create.test.tsx`
- `src/pages/SessionForm.edit.test.tsx`

API modules mocked with `vi.mock()`. Timer tests use `vi.useFakeTimers()`. No MSW.

---

## Infrastructure

**New dev dependencies:**
- `@testing-library/react`
- `@testing-library/user-event`
- `@testing-library/jest-dom`

(`jsdom` is bundled with Vitest — no separate install.)

**Config changes:**
- `vite.config.ts` — add `environment: 'jsdom'` and `setupFiles: ['./src/test/setup.ts']` inside the `test` block
- New `src/test/setup.ts` — `import '@testing-library/jest-dom'`

---

## `LibraryPicker.test.tsx`

No router, no API. All behavior is props-driven.

**Rendering:**
- Shows heading
- Renders one chip per item
- Shows empty-state message when `items` is `[]`
- Active chips have the active class and show the `✦` mark
- Inactive chips do not show the mark

**Interaction:**
- Clicking a chip calls `onToggle` with that item's id
- Clicking an already-selected chip also calls `onToggle`

**Inline creation form:**
- Submit button is disabled when input is empty or whitespace-only
- Submitting calls `onCreate` with the trimmed label
- Input clears after successful creation
- Button shows `…` and input is disabled while `onCreate` is in-flight
- Submitting with only whitespace does not call `onCreate`

---

## `Dashboard.test.tsx`

Wrapped in `MemoryRouter`. Mocks: `vi.mock('../api/sessions')`.

**Data loading:**
- Shows loading state on initial render
- After load: renders streak, week total, month total from mocked stats
- After load with empty sessions: shows "No sessions yet" message
- After load with sessions: renders a card per session with date, duration, notes, song tags, technique tags

**Quick log form:**
- Filling in date + duration and submitting calls `sessionsApi.create` with correct payload
- Form resets to today's date + empty fields after submit
- "Saved ✦" flash appears after submit and clears after 2.2s (fake timers)
- Submitting with duration `0` or empty does not call `sessionsApi.create`

**Timer:**
- Initial state: shows `00:00`, "Ready" label, "Start Practice" button
- After clicking Start: shows "Practicing" label, "End Session" button
- Advancing 90 seconds with fake timers updates display to `01:30`
- Clicking Stop: calls `sessionsApi.create` with correct date; short sessions round up to `duration_minutes: 1`
- After Stop: display resets to `00:00`, state returns to "Ready"
- "Saved ✦" flash appears after Stop

---

## `SessionForm.create.test.tsx`

Route: `/sessions/new`. Mocks: `sessionsApi`, `songsApi`, `techniquesApi`.

- Shows "New Session" title, no loading state
- Songs and techniques load and render via `LibraryPicker`
- Filling date + duration and submitting calls `sessionsApi.create` with correct payload
- After submit, navigates to `/`
- Submitting with duration `0` does not call `sessionsApi.create`
- With songs selected before submit: calls `sessionsApi.attachSong` for each selected id after session is created
- Inline song creation: calls `songsApi.create`, new song appears as a selected chip, gets attached on submit

---

## `SessionForm.edit.test.tsx`

Route: `/sessions/5/edit` with a pre-defined mock session. Mocks: `sessionsApi`, `songsApi`, `techniquesApi`.

- Shows loading state while `sessionsApi.get` is in-flight
- After load: form fields pre-populated with session data
- Shows "Edit Session" title
- Submitting calls `sessionsApi.update` (not `create`) with form values
- `syncAttachments` — adding a song not originally linked: calls `attachSong` only for the new one
- `syncAttachments` — removing an originally linked song: calls `detachSong` only for the removed one
- `syncAttachments` — no changes: neither attach nor detach called
