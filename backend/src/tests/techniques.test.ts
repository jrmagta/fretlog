import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { setupTestDb, clearTables, teardownTestDb } from './helpers';

beforeAll(async () => { await setupTestDb(); });
afterAll(async () => { await teardownTestDb(); });
beforeEach(async () => { await clearTables(); });

describe('POST /api/techniques', () => {
  it('creates a technique with required fields', async () => {
    const res = await request(app).post('/api/techniques').send({ name: 'Fingerpicking' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('Fingerpicking');
    expect(res.body.category).toBeNull();
  });

  it('creates a technique with all fields', async () => {
    const res = await request(app)
      .post('/api/techniques')
      .send({ name: 'Fingerpicking', category: 'rhythm', reference_url: 'https://example.com' });

    expect(res.status).toBe(201);
    expect(res.body.category).toBe('rhythm');
    expect(res.body.reference_url).toBe('https://example.com');
  });

  it('rejects missing name', async () => {
    const res = await request(app).post('/api/techniques').send({ category: 'rhythm' });
    expect(res.status).toBe(400);
  });

  it('rejects blank name', async () => {
    const res = await request(app).post('/api/techniques').send({ name: '   ' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/techniques', () => {
  it('returns empty list when no techniques', async () => {
    const res = await request(app).get('/api/techniques');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns active techniques ordered by name', async () => {
    await request(app).post('/api/techniques').send({ name: 'Vibrato' });
    await request(app).post('/api/techniques').send({ name: 'Barre Chords' });
    await request(app).post('/api/techniques').send({ name: 'Fingerpicking' });

    const res = await request(app).get('/api/techniques');

    expect(res.status).toBe(200);
    expect(res.body.map((t: { name: string }) => t.name)).toEqual([
      'Barre Chords', 'Fingerpicking', 'Vibrato',
    ]);
  });

  it('excludes soft-deleted techniques', async () => {
    const created = await request(app).post('/api/techniques').send({ name: 'Vibrato' });
    await request(app).delete(`/api/techniques/${created.body.id}`);

    const res = await request(app).get('/api/techniques');
    expect(res.body).toEqual([]);
  });
});

describe('GET /api/techniques/:id', () => {
  it('returns a technique by id', async () => {
    const created = await request(app).post('/api/techniques').send({ name: 'Vibrato' });
    const res = await request(app).get(`/api/techniques/${created.body.id}`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Vibrato');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/techniques/99999');
    expect(res.status).toBe(404);
  });

  it('returns 404 for soft-deleted technique', async () => {
    const created = await request(app).post('/api/techniques').send({ name: 'Vibrato' });
    await request(app).delete(`/api/techniques/${created.body.id}`);

    const res = await request(app).get(`/api/techniques/${created.body.id}`);
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/techniques/:id', () => {
  it('updates a technique', async () => {
    const created = await request(app).post('/api/techniques').send({ name: 'Vibrato' });
    const res = await request(app)
      .put(`/api/techniques/${created.body.id}`)
      .send({ name: 'Vibrato & Bends', category: 'lead' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Vibrato & Bends');
    expect(res.body.category).toBe('lead');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).put('/api/techniques/99999').send({ name: 'X' });
    expect(res.status).toBe(404);
  });

  it('rejects missing name', async () => {
    const created = await request(app).post('/api/techniques').send({ name: 'Vibrato' });
    const res = await request(app).put(`/api/techniques/${created.body.id}`).send({ category: 'lead' });
    expect(res.status).toBe(400);
  });

  it('rejects blank name', async () => {
    const created = await request(app).post('/api/techniques').send({ name: 'Vibrato' });
    const res = await request(app).put(`/api/techniques/${created.body.id}`).send({ name: '   ' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/techniques/:id', () => {
  it('soft-deletes a technique', async () => {
    const created = await request(app).post('/api/techniques').send({ name: 'Vibrato' });

    const del = await request(app).delete(`/api/techniques/${created.body.id}`);
    expect(del.status).toBe(204);

    const get = await request(app).get(`/api/techniques/${created.body.id}`);
    expect(get.status).toBe(404);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/api/techniques/99999');
    expect(res.status).toBe(404);
  });
});
