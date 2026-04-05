import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

// GET /api/techniques
router.get('/', async (_req: Request, res: Response) => {
  const { rows } = await pool.query(
    `SELECT id, name, category, reference_url, created_at
     FROM techniques
     WHERE deleted_at IS NULL
     ORDER BY name ASC`
  );
  res.json(rows);
});

// GET /api/techniques/:id
router.get('/:id', async (req: Request, res: Response) => {
  const { rows } = await pool.query(
    `SELECT id, name, category, reference_url, created_at
     FROM techniques
     WHERE id = $1 AND deleted_at IS NULL`,
    [req.params.id]
  );

  if (rows.length === 0) {
    res.status(404).json({ error: 'Technique not found' });
    return;
  }

  res.json(rows[0]);
});

// POST /api/techniques
router.post('/', async (req: Request, res: Response) => {
  const { name, category, reference_url } = req.body;

  if (!name?.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const { rows } = await pool.query(
    `INSERT INTO techniques (name, category, reference_url)
     VALUES ($1, $2, $3)
     RETURNING id, name, category, reference_url, created_at`,
    [name.trim(), category ?? null, reference_url ?? null]
  );

  res.status(201).json(rows[0]);
});

// PUT /api/techniques/:id
router.put('/:id', async (req: Request, res: Response) => {
  const { name, category, reference_url } = req.body;

  if (!name?.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const { rows } = await pool.query(
    `UPDATE techniques
     SET name = $1, category = $2, reference_url = $3
     WHERE id = $4 AND deleted_at IS NULL
     RETURNING id, name, category, reference_url, created_at`,
    [name.trim(), category ?? null, reference_url ?? null, req.params.id]
  );

  if (rows.length === 0) {
    res.status(404).json({ error: 'Technique not found' });
    return;
  }

  res.json(rows[0]);
});

// DELETE /api/techniques/:id  (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  const { rowCount } = await pool.query(
    `UPDATE techniques SET deleted_at = now()
     WHERE id = $1 AND deleted_at IS NULL`,
    [req.params.id]
  );

  if (rowCount === 0) {
    res.status(404).json({ error: 'Technique not found' });
    return;
  }

  res.status(204).send();
});

export default router;
