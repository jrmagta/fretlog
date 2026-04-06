import { api } from './client';
import type { Song, CreateSongInput } from './types';

export const songsApi = {
  list: () =>
    api.get<Song[]>('/songs'),

  get: (id: number) =>
    api.get<Song>(`/songs/${id}`),

  create: (input: CreateSongInput) =>
    api.post<Song>('/songs', input),

  update: (id: number, input: CreateSongInput) =>
    api.put<Song>(`/songs/${id}`, input),

  delete: (id: number) =>
    api.delete(`/songs/${id}`),
};
