import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

router.post('/reset', async (_req: Request, res: Response) => {
  await pool.query(
    'TRUNCATE sessions, session_songs, session_techniques, songs, techniques RESTART IDENTITY CASCADE'
  );
  res.status(204).end();
});

export default router;
