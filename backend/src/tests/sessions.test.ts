import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { setupTestDb, clearTables, teardownTestDb } from './helpers';

beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await clearTables();
});

describe('GET /api/sessions/stats', () => {
  it('returns zeros when no sessions', async () => {
    const res = await request(app).get('/api/sessions/stats');
    expect(res.status).toBe(200);
    expect(res.body.streak_days).toBe(0);
    expect(res.body.week_minutes).toBe(0);
    expect(res.body.month_minutes).toBe(0);
  });

  it('counts week and month minutes correctly', async () => {
    const today = new Date().toISOString().split('T')[0];
    await request(app).post('/api/sessions').send({ date: today, duration_minutes: 30 });
    await request(app).post('/api/sessions').send({ date: today, duration_minutes: 20 });

    const res = await request(app).get('/api/sessions/stats');
    expect(res.body.week_minutes).toBeGreaterThanOrEqual(50);
    expect(res.body.month_minutes).toBeGreaterThanOrEqual(50);
  });

  it('returns a streak of 1 for a session today', async () => {
    const today = new Date().toISOString().split('T')[0];
    await request(app).post('/api/sessions').send({ date: today, duration_minutes: 30 });

    const res = await request(app).get('/api/sessions/stats');
    expect(res.body.streak_days).toBe(1);
  });

  it('returns a streak of 2 for sessions today and yesterday', async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    await request(app).post('/api/sessions').send({ date: today.toISOString().split('T')[0], duration_minutes: 30 });
    await request(app).post('/api/sessions').send({ date: yesterday.toISOString().split('T')[0], duration_minutes: 30 });

    const res = await request(app).get('/api/sessions/stats');
    expect(res.body.streak_days).toBe(2);
  });

  it('returns 0 streak when last session was 2+ days ago', async () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    await request(app).post('/api/sessions').send({ date: twoDaysAgo.toISOString().split('T')[0], duration_minutes: 30 });

    const res = await request(app).get('/api/sessions/stats');
    expect(res.body.streak_days).toBe(0);
  });

  it('does not count a broken streak', async () => {
    const today = new Date();
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);

    // gap on yesterday breaks the streak
    await request(app).post('/api/sessions').send({ date: today.toISOString().split('T')[0], duration_minutes: 30 });
    await request(app).post('/api/sessions').send({ date: twoDaysAgo.toISOString().split('T')[0], duration_minutes: 30 });

    const res = await request(app).get('/api/sessions/stats');
    expect(res.body.streak_days).toBe(1);
  });
});

describe('POST /api/sessions', () => {
  it('creates a session with required fields', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send({ duration_minutes: 30 });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.duration_minutes).toBe(30);
    expect(res.body.date).toBeDefined();
  });

  it('creates a session with all fields', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send({ date: '2026-01-15', duration_minutes: 45, notes: 'Good session', reference_url: 'https://example.com' });

    expect(res.status).toBe(201);
    expect(res.body.notes).toBe('Good session');
    expect(res.body.reference_url).toBe('https://example.com');
  });

  it('rejects missing duration_minutes', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send({ date: '2026-01-15' });

    expect(res.status).toBe(400);
  });

  it('rejects duration_minutes < 1', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send({ duration_minutes: 0 });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/sessions', () => {
  it('returns empty list when no sessions', async () => {
    const res = await request(app).get('/api/sessions');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it('returns sessions ordered by date descending', async () => {
    await request(app).post('/api/sessions').send({ date: '2026-01-01', duration_minutes: 10 });
    await request(app).post('/api/sessions').send({ date: '2026-01-03', duration_minutes: 20 });
    await request(app).post('/api/sessions').send({ date: '2026-01-02', duration_minutes: 30 });

    const res = await request(app).get('/api/sessions');

    expect(res.status).toBe(200);
    expect(res.body.data[0].duration_minutes).toBe(20);
    expect(res.body.data[1].duration_minutes).toBe(30);
    expect(res.body.data[2].duration_minutes).toBe(10);
  });

  it('respects limit and offset', async () => {
    for (let i = 1; i <= 5; i++) {
      await request(app).post('/api/sessions').send({ duration_minutes: i * 10 });
    }

    const res = await request(app).get('/api/sessions?limit=2&offset=2');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.total).toBe(5);
  });
});

describe('GET /api/sessions/:id', () => {
  it('returns a session with empty songs and techniques', async () => {
    const created = await request(app).post('/api/sessions').send({ duration_minutes: 60 });
    const res = await request(app).get(`/api/sessions/${created.body.id}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
    expect(res.body.songs).toEqual([]);
    expect(res.body.techniques).toEqual([]);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/sessions/99999');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/sessions/:id — soft-deleted library items', () => {
  it('still shows a soft-deleted song in session detail (preserves history)', async () => {
    const session = await request(app).post('/api/sessions').send({ duration_minutes: 30 });
    const song = await request(app).post('/api/songs').send({ title: 'Yesterday' });

    await request(app).post(`/api/sessions/${session.body.id}/songs/${song.body.id}`);
    await request(app).delete(`/api/songs/${song.body.id}`);

    const detail = await request(app).get(`/api/sessions/${session.body.id}`);
    expect(detail.body.songs).toHaveLength(1);
    expect(detail.body.songs[0].title).toBe('Yesterday');
  });

  it('still shows a soft-deleted technique in session detail (preserves history)', async () => {
    const session = await request(app).post('/api/sessions').send({ duration_minutes: 30 });
    const tech = await request(app).post('/api/techniques').send({ name: 'Hammer-on' });

    await request(app).post(`/api/sessions/${session.body.id}/techniques/${tech.body.id}`);
    await request(app).delete(`/api/techniques/${tech.body.id}`);

    const detail = await request(app).get(`/api/sessions/${session.body.id}`);
    expect(detail.body.techniques).toHaveLength(1);
    expect(detail.body.techniques[0].name).toBe('Hammer-on');
  });
});

describe('Session song links', () => {
  it('attaches and detaches a song', async () => {
    const session = await request(app).post('/api/sessions').send({ duration_minutes: 30 });
    const song = await request(app).post('/api/songs').send({ title: 'Blackbird' });

    const attach = await request(app).post(`/api/sessions/${session.body.id}/songs/${song.body.id}`);
    expect(attach.status).toBe(204);

    const detail = await request(app).get(`/api/sessions/${session.body.id}`);
    expect(detail.body.songs).toHaveLength(1);
    expect(detail.body.songs[0].title).toBe('Blackbird');

    const detach = await request(app).delete(`/api/sessions/${session.body.id}/songs/${song.body.id}`);
    expect(detach.status).toBe(204);

    const after = await request(app).get(`/api/sessions/${session.body.id}`);
    expect(after.body.songs).toHaveLength(0);
  });

  it('is idempotent on duplicate attach', async () => {
    const session = await request(app).post('/api/sessions').send({ duration_minutes: 30 });
    const song = await request(app).post('/api/songs').send({ title: 'Blackbird' });

    await request(app).post(`/api/sessions/${session.body.id}/songs/${song.body.id}`);
    const dup = await request(app).post(`/api/sessions/${session.body.id}/songs/${song.body.id}`);
    expect(dup.status).toBe(204);

    const detail = await request(app).get(`/api/sessions/${session.body.id}`);
    expect(detail.body.songs).toHaveLength(1);
  });

  it('returns 404 when attaching a non-existent song', async () => {
    const session = await request(app).post('/api/sessions').send({ duration_minutes: 30 });
    const res = await request(app).post(`/api/sessions/${session.body.id}/songs/99999`);
    expect(res.status).toBe(404);
  });

  it('returns 404 when attaching a soft-deleted song', async () => {
    const session = await request(app).post('/api/sessions').send({ duration_minutes: 30 });
    const song = await request(app).post('/api/songs').send({ title: 'Blackbird' });
    await request(app).delete(`/api/songs/${song.body.id}`);

    const res = await request(app).post(`/api/sessions/${session.body.id}/songs/${song.body.id}`);
    expect(res.status).toBe(404);
  });

  it('returns 404 when detaching a link that does not exist', async () => {
    const session = await request(app).post('/api/sessions').send({ duration_minutes: 30 });
    const song = await request(app).post('/api/songs').send({ title: 'Blackbird' });
    const res = await request(app).delete(`/api/sessions/${session.body.id}/songs/${song.body.id}`);
    expect(res.status).toBe(404);
  });
});

describe('Session technique links', () => {
  it('attaches and detaches a technique', async () => {
    const session = await request(app).post('/api/sessions').send({ duration_minutes: 30 });
    const tech = await request(app).post('/api/techniques').send({ name: 'Fingerpicking' });

    const attach = await request(app).post(`/api/sessions/${session.body.id}/techniques/${tech.body.id}`);
    expect(attach.status).toBe(204);

    const detail = await request(app).get(`/api/sessions/${session.body.id}`);
    expect(detail.body.techniques).toHaveLength(1);
    expect(detail.body.techniques[0].name).toBe('Fingerpicking');

    const detach = await request(app).delete(`/api/sessions/${session.body.id}/techniques/${tech.body.id}`);
    expect(detach.status).toBe(204);

    const after = await request(app).get(`/api/sessions/${session.body.id}`);
    expect(after.body.techniques).toHaveLength(0);
  });

  it('is idempotent on duplicate attach', async () => {
    const session = await request(app).post('/api/sessions').send({ duration_minutes: 30 });
    const tech = await request(app).post('/api/techniques').send({ name: 'Fingerpicking' });

    await request(app).post(`/api/sessions/${session.body.id}/techniques/${tech.body.id}`);
    const dup = await request(app).post(`/api/sessions/${session.body.id}/techniques/${tech.body.id}`);
    expect(dup.status).toBe(204);

    const detail = await request(app).get(`/api/sessions/${session.body.id}`);
    expect(detail.body.techniques).toHaveLength(1);
  });

  it('returns 404 when attaching a non-existent technique', async () => {
    const session = await request(app).post('/api/sessions').send({ duration_minutes: 30 });
    const res = await request(app).post(`/api/sessions/${session.body.id}/techniques/99999`);
    expect(res.status).toBe(404);
  });

  it('returns 404 when attaching a soft-deleted technique', async () => {
    const session = await request(app).post('/api/sessions').send({ duration_minutes: 30 });
    const tech = await request(app).post('/api/techniques').send({ name: 'Fingerpicking' });
    await request(app).delete(`/api/techniques/${tech.body.id}`);

    const res = await request(app).post(`/api/sessions/${session.body.id}/techniques/${tech.body.id}`);
    expect(res.status).toBe(404);
  });

  it('returns 404 when detaching a link that does not exist', async () => {
    const session = await request(app).post('/api/sessions').send({ duration_minutes: 30 });
    const tech = await request(app).post('/api/techniques').send({ name: 'Fingerpicking' });
    const res = await request(app).delete(`/api/sessions/${session.body.id}/techniques/${tech.body.id}`);
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/sessions/:id', () => {
  it('updates a session', async () => {
    const created = await request(app).post('/api/sessions').send({ duration_minutes: 30 });

    const res = await request(app)
      .put(`/api/sessions/${created.body.id}`)
      .send({ date: created.body.date, duration_minutes: 60, notes: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.duration_minutes).toBe(60);
    expect(res.body.notes).toBe('Updated');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app)
      .put('/api/sessions/99999')
      .send({ date: '2026-01-01', duration_minutes: 30 });

    expect(res.status).toBe(404);
  });

  it('rejects missing duration_minutes', async () => {
    const created = await request(app).post('/api/sessions').send({ duration_minutes: 30 });

    const res = await request(app)
      .put(`/api/sessions/${created.body.id}`)
      .send({ date: created.body.date });

    expect(res.status).toBe(400);
  });

  it('rejects duration_minutes < 1', async () => {
    const created = await request(app).post('/api/sessions').send({ duration_minutes: 30 });

    const res = await request(app)
      .put(`/api/sessions/${created.body.id}`)
      .send({ date: created.body.date, duration_minutes: 0 });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/sessions/:id', () => {
  it('deletes a session', async () => {
    const created = await request(app).post('/api/sessions').send({ duration_minutes: 30 });

    const del = await request(app).delete(`/api/sessions/${created.body.id}`);
    expect(del.status).toBe(204);

    const get = await request(app).get(`/api/sessions/${created.body.id}`);
    expect(get.status).toBe(404);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/api/sessions/99999');
    expect(res.status).toBe(404);
  });
});
