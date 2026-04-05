import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

// GET /api/songs
router.get('/', async (_req: Request, res: Response) => {
  const { rows } = await pool.query(
    `SELECT id, title, artist, reference_url, created_at
     FROM songs
     WHERE deleted_at IS NULL
     ORDER BY title ASC`
  );
  res.json(rows);
});

// GET /api/songs/:id
router.get('/:id', async (req: Request, res: Response) => {
  const { rows } = await pool.query(
    `SELECT id, title, artist, reference_url, created_at
     FROM songs
     WHERE id = $1 AND deleted_at IS NULL`,
    [req.params.id]
  );

  if (rows.length === 0) {
    res.status(404).json({ error: 'Song not found' });
    return;
  }

  res.json(rows[0]);
});

// POST /api/songs
router.post('/', async (req: Request, res: Response) => {
  const { title, artist, reference_url } = req.body;

  if (!title?.trim()) {
    res.status(400).json({ error: 'title is required' });
    return;
  }

  const { rows } = await pool.query(
    `INSERT INTO songs (title, artist, reference_url)
     VALUES ($1, $2, $3)
     RETURNING id, title, artist, reference_url, created_at`,
    [title.trim(), artist ?? null, reference_url ?? null]
  );

  res.status(201).json(rows[0]);
});

// PUT /api/songs/:id
router.put('/:id', async (req: Request, res: Response) => {
  const { title, artist, reference_url } = req.body;

  if (!title?.trim()) {
    res.status(400).json({ error: 'title is required' });
    return;
  }

  const { rows } = await pool.query(
    `UPDATE songs
     SET title = $1, artist = $2, reference_url = $3
     WHERE id = $4 AND deleted_at IS NULL
     RETURNING id, title, artist, reference_url, created_at`,
    [title.trim(), artist ?? null, reference_url ?? null, req.params.id]
  );

  if (rows.length === 0) {
    res.status(404).json({ error: 'Song not found' });
    return;
  }

  res.json(rows[0]);
});

// DELETE /api/songs/:id  (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  const { rowCount } = await pool.query(
    `UPDATE songs SET deleted_at = now()
     WHERE id = $1 AND deleted_at IS NULL`,
    [req.params.id]
  );

  if (rowCount === 0) {
    res.status(404).json({ error: 'Song not found' });
    return;
  }

  res.status(204).send();
});

export default router;
