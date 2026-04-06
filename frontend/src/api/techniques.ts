import { api } from './client';
import type { Technique, CreateTechniqueInput } from './types';

export const techniquesApi = {
  list: () =>
    api.get<Technique[]>('/techniques'),

  get: (id: number) =>
    api.get<Technique>(`/techniques/${id}`),

  create: (input: CreateTechniqueInput) =>
    api.post<Technique>('/techniques', input),

  update: (id: number, input: CreateTechniqueInput) =>
    api.put<Technique>(`/techniques/${id}`, input),

  delete: (id: number) =>
    api.delete(`/techniques/${id}`),
};
