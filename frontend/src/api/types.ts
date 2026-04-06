export interface Session {
  id: number;
  date: string;
  duration_minutes: number;
  notes: string | null;
  reference_url: string | null;
  created_at: string;
  songs?: Song[];
  techniques?: Technique[];
}

export interface Song {
  id: number;
  title: string;
  artist: string | null;
  reference_url: string | null;
  created_at: string;
}

export interface Technique {
  id: number;
  name: string;
  category: string | null;
  reference_url: string | null;
  created_at: string;
}

export interface SessionsPage {
  data: Session[];
  total: number;
  limit: number;
  offset: number;
}

export interface Stats {
  streak_days: number;
  week_minutes: number;
  month_minutes: number;
}

export interface CreateSessionInput {
  date?: string;
  duration_minutes: number;
  notes?: string;
  reference_url?: string;
}

export interface UpdateSessionInput {
  date: string;
  duration_minutes: number;
  notes?: string;
  reference_url?: string;
}

export interface CreateSongInput {
  title: string;
  artist?: string;
  reference_url?: string;
}

export interface CreateTechniqueInput {
  name: string;
  category?: string;
  reference_url?: string;
}
