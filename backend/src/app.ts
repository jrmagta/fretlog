import express from 'express';
import cors from 'cors';
import { pool } from './db';
import sessionsRouter from './routes/sessions';
import songsRouter from './routes/songs';
import techniquesRouter from './routes/techniques';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/sessions', sessionsRouter);
app.use('/api/songs', songsRouter);
app.use('/api/techniques', techniquesRouter);

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({ ok: false, error: String(err) });
  }
});

export default app;
