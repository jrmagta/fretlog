import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

// GET /api/sessions?limit=20&offset=0
router.get('/', async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = parseInt(req.query.offset as string) || 0;

  const { rows } = await pool.query(
    `SELECT id, date, duration_minutes, notes, reference_url, created_at
     FROM sessions
     ORDER BY date DESC, created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  const total = await pool.query('SELECT COUNT(*) FROM sessions');

  res.json({ data: rows, total: parseInt(total.rows[0].count), limit, offset });
});

// GET /api/sessions/:id
router.get('/:id', async (req: Request, res: Response) => {
  const { rows } = await pool.query(
    `SELECT id, date, duration_minutes, notes, reference_url, created_at
     FROM sessions WHERE id = $1`,
    [req.params.id]
  );

  if (rows.length === 0) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const [songs, techniques] = await Promise.all([
    pool.query(
      `SELECT s.id, s.title, s.artist, s.reference_url
       FROM songs s
       JOIN session_songs ss ON ss.song_id = s.id
       WHERE ss.session_id = $1
       ORDER BY s.title ASC`,
      [req.params.id]
    ),
    pool.query(
      `SELECT t.id, t.name, t.category, t.reference_url
       FROM techniques t
       JOIN session_techniques st ON st.technique_id = t.id
       WHERE st.session_id = $1
       ORDER BY t.name ASC`,
      [req.params.id]
    ),
  ]);

  res.json({ ...rows[0], songs: songs.rows, techniques: techniques.rows });
});

// POST /api/sessions/:id/songs/:songId
router.post('/:id/songs/:songId', async (req: Request, res: Response) => {
  const sessionCheck = await pool.query('SELECT id FROM sessions WHERE id = $1', [req.params.id]);
  if (sessionCheck.rows.length === 0) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const songCheck = await pool.query('SELECT id FROM songs WHERE id = $1 AND deleted_at IS NULL', [req.params.songId]);
  if (songCheck.rows.length === 0) {
    res.status(404).json({ error: 'Song not found' });
    return;
  }

  await pool.query(
    `INSERT INTO session_songs (session_id, song_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [req.params.id, req.params.songId]
  );

  res.status(204).send();
});

// DELETE /api/sessions/:id/songs/:songId
router.delete('/:id/songs/:songId', async (req: Request, res: Response) => {
  const { rowCount } = await pool.query(
    'DELETE FROM session_songs WHERE session_id = $1 AND song_id = $2',
    [req.params.id, req.params.songId]
  );

  if (rowCount === 0) {
    res.status(404).json({ error: 'Session/song link not found' });
    return;
  }

  res.status(204).send();
});

// POST /api/sessions/:id/techniques/:techId
router.post('/:id/techniques/:techId', async (req: Request, res: Response) => {
  const sessionCheck = await pool.query('SELECT id FROM sessions WHERE id = $1', [req.params.id]);
  if (sessionCheck.rows.length === 0) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const techCheck = await pool.query('SELECT id FROM techniques WHERE id = $1 AND deleted_at IS NULL', [req.params.techId]);
  if (techCheck.rows.length === 0) {
    res.status(404).json({ error: 'Technique not found' });
    return;
  }

  await pool.query(
    `INSERT INTO session_techniques (session_id, technique_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [req.params.id, req.params.techId]
  );

  res.status(204).send();
});

// DELETE /api/sessions/:id/techniques/:techId
router.delete('/:id/techniques/:techId', async (req: Request, res: Response) => {
  const { rowCount } = await pool.query(
    'DELETE FROM session_techniques WHERE session_id = $1 AND technique_id = $2',
    [req.params.id, req.params.techId]
  );

  if (rowCount === 0) {
    res.status(404).json({ error: 'Session/technique link not found' });
    return;
  }

  res.status(204).send();
});

// POST /api/sessions
router.post('/', async (req: Request, res: Response) => {
  const { date, duration_minutes, notes, reference_url } = req.body;

  if (!duration_minutes || duration_minutes < 1) {
    res.status(400).json({ error: 'duration_minutes is required and must be >= 1' });
    return;
  }

  const { rows } = await pool.query(
    `INSERT INTO sessions (date, duration_minutes, notes, reference_url)
     VALUES ($1, $2, $3, $4)
     RETURNING id, date, duration_minutes, notes, reference_url, created_at`,
    [date ?? new Date().toISOString().split('T')[0], duration_minutes, notes ?? null, reference_url ?? null]
  );

  res.status(201).json(rows[0]);
});

// PUT /api/sessions/:id
router.put('/:id', async (req: Request, res: Response) => {
  const { date, duration_minutes, notes, reference_url } = req.body;

  if (!duration_minutes || duration_minutes < 1) {
    res.status(400).json({ error: 'duration_minutes is required and must be >= 1' });
    return;
  }

  const { rows } = await pool.query(
    `UPDATE sessions
     SET date = $1, duration_minutes = $2, notes = $3, reference_url = $4
     WHERE id = $5
     RETURNING id, date, duration_minutes, notes, reference_url, created_at`,
    [date, duration_minutes, notes ?? null, reference_url ?? null, req.params.id]
  );

  if (rows.length === 0) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  res.json(rows[0]);
});

// DELETE /api/sessions/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { rowCount } = await pool.query(
    'DELETE FROM sessions WHERE id = $1',
    [req.params.id]
  );

  if (rowCount === 0) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  res.status(204).send();
});

export default router;
