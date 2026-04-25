import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import { setupTestDb, teardownTestDb } from './helpers';
import { pool } from '../db';

beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

describe('POST /api/test/reset', () => {
  it('truncates all tables and returns 204', async () => {
    await request(app).post('/api/sessions').send({ date: '2026-04-01', duration_minutes: 30 });
    await request(app).post('/api/songs').send({ title: 'Wonderwall', artist: 'Oasis' });

    const before = await pool.query('SELECT COUNT(*)::int AS n FROM sessions');
    expect(before.rows[0].n).toBeGreaterThan(0);

    const res = await request(app).post('/api/test/reset');
    expect(res.status).toBe(204);

    const sessions = await pool.query('SELECT COUNT(*)::int AS n FROM sessions');
    const songs = await pool.query('SELECT COUNT(*)::int AS n FROM songs');
    expect(sessions.rows[0].n).toBe(0);
    expect(songs.rows[0].n).toBe(0);
  });
});
