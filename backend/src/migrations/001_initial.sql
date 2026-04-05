CREATE TABLE IF NOT EXISTS songs (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  artist        TEXT,
  reference_url TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS techniques (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  category      TEXT,
  reference_url TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sessions (
  id               SERIAL PRIMARY KEY,
  date             DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes INTEGER NOT NULL,
  notes            TEXT,
  reference_url    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS session_songs (
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  song_id    INTEGER NOT NULL REFERENCES songs(id),
  PRIMARY KEY (session_id, song_id)
);

CREATE TABLE IF NOT EXISTS session_techniques (
  session_id   INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  technique_id INTEGER NOT NULL REFERENCES techniques(id),
  PRIMARY KEY (session_id, technique_id)
);
