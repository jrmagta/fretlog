import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { setupTestDb, clearTables, teardownTestDb } from './helpers';

beforeAll(async () => { await setupTestDb(); });
afterAll(async () => { await teardownTestDb(); });
beforeEach(async () => { await clearTables(); });

describe('POST /api/songs', () => {
  it('creates a song with required fields', async () => {
    const res = await request(app).post('/api/songs').send({ title: 'Blackbird' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBe('Blackbird');
    expect(res.body.artist).toBeNull();
  });

  it('creates a song with all fields', async () => {
    const res = await request(app)
      .post('/api/songs')
      .send({ title: 'Blackbird', artist: 'The Beatles', reference_url: 'https://example.com' });

    expect(res.status).toBe(201);
    expect(res.body.artist).toBe('The Beatles');
    expect(res.body.reference_url).toBe('https://example.com');
  });

  it('rejects missing title', async () => {
    const res = await request(app).post('/api/songs').send({ artist: 'The Beatles' });
    expect(res.status).toBe(400);
  });

  it('rejects blank title', async () => {
    const res = await request(app).post('/api/songs').send({ title: '   ' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/songs', () => {
  it('returns empty list when no songs', async () => {
    const res = await request(app).get('/api/songs');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns active songs ordered by title', async () => {
    await request(app).post('/api/songs').send({ title: 'Wonderwall' });
    await request(app).post('/api/songs').send({ title: 'Blackbird' });
    await request(app).post('/api/songs').send({ title: 'Hotel California' });

    const res = await request(app).get('/api/songs');

    expect(res.status).toBe(200);
    expect(res.body.map((s: { title: string }) => s.title)).toEqual([
      'Blackbird', 'Hotel California', 'Wonderwall',
    ]);
  });

  it('excludes soft-deleted songs', async () => {
    const created = await request(app).post('/api/songs').send({ title: 'Blackbird' });
    await request(app).delete(`/api/songs/${created.body.id}`);

    const res = await request(app).get('/api/songs');
    expect(res.body).toEqual([]);
  });
});

describe('GET /api/songs/:id', () => {
  it('returns a song by id', async () => {
    const created = await request(app).post('/api/songs').send({ title: 'Blackbird' });
    const res = await request(app).get(`/api/songs/${created.body.id}`);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Blackbird');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/songs/99999');
    expect(res.status).toBe(404);
  });

  it('returns 404 for soft-deleted song', async () => {
    const created = await request(app).post('/api/songs').send({ title: 'Blackbird' });
    await request(app).delete(`/api/songs/${created.body.id}`);

    const res = await request(app).get(`/api/songs/${created.body.id}`);
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/songs/:id', () => {
  it('updates a song', async () => {
    const created = await request(app).post('/api/songs').send({ title: 'Blackbird' });
    const res = await request(app)
      .put(`/api/songs/${created.body.id}`)
      .send({ title: 'Blackbird (Live)', artist: 'The Beatles' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Blackbird (Live)');
    expect(res.body.artist).toBe('The Beatles');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).put('/api/songs/99999').send({ title: 'X' });
    expect(res.status).toBe(404);
  });

  it('rejects missing title', async () => {
    const created = await request(app).post('/api/songs').send({ title: 'Blackbird' });
    const res = await request(app).put(`/api/songs/${created.body.id}`).send({ artist: 'The Beatles' });
    expect(res.status).toBe(400);
  });

  it('rejects blank title', async () => {
    const created = await request(app).post('/api/songs').send({ title: 'Blackbird' });
    const res = await request(app).put(`/api/songs/${created.body.id}`).send({ title: '   ' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/songs/:id', () => {
  it('soft-deletes a song', async () => {
    const created = await request(app).post('/api/songs').send({ title: 'Blackbird' });

    const del = await request(app).delete(`/api/songs/${created.body.id}`);
    expect(del.status).toBe(204);

    const get = await request(app).get(`/api/songs/${created.body.id}`);
    expect(get.status).toBe(404);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/api/songs/99999');
    expect(res.status).toBe(404);
  });
});
