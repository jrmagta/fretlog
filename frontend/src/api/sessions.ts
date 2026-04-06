import { api } from './client';
import type {
  Session, SessionsPage, Stats,
  CreateSessionInput, UpdateSessionInput,
} from './types';

export const sessionsApi = {
  list: (limit = 20, offset = 0) =>
    api.get<SessionsPage>(`/sessions?limit=${limit}&offset=${offset}`),

  get: (id: number) =>
    api.get<Session>(`/sessions/${id}`),

  stats: () =>
    api.get<Stats>('/sessions/stats'),

  create: (input: CreateSessionInput) =>
    api.post<Session>('/sessions', input),

  update: (id: number, input: UpdateSessionInput) =>
    api.put<Session>(`/sessions/${id}`, input),

  delete: (id: number) =>
    api.delete(`/sessions/${id}`),

  attachSong: (sessionId: number, songId: number) =>
    api.post<void>(`/sessions/${sessionId}/songs/${songId}`),

  detachSong: (sessionId: number, songId: number) =>
    api.delete(`/sessions/${sessionId}/songs/${songId}`),

  attachTechnique: (sessionId: number, techniqueId: number) =>
    api.post<void>(`/sessions/${sessionId}/techniques/${techniqueId}`),

  detachTechnique: (sessionId: number, techniqueId: number) =>
    api.delete(`/sessions/${sessionId}/techniques/${techniqueId}`),
};
