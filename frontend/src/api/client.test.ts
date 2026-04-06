import { describe, it, expect, vi, afterEach } from 'vitest';
import { api } from './client';

function makeResponse(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: body !== undefined
      ? vi.fn().mockResolvedValue(body)
      : vi.fn().mockRejectedValue(new SyntaxError('No body')),
  };
}

function stubFetch(status: number, body?: unknown) {
  const mock = vi.fn().mockResolvedValue(makeResponse(status, body));
  vi.stubGlobal('fetch', mock);
  return mock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api.get', () => {
  it('returns parsed JSON on a 200 response', async () => {
    stubFetch(200, { id: 1 });
    expect(await api.get('/sessions')).toEqual({ id: 1 });
  });

  it('calls fetch with the /api prefix and Content-Type header', async () => {
    const mock = stubFetch(200, {});
    await api.get('/sessions');
    expect(mock).toHaveBeenCalledWith(
      '/api/sessions',
      expect.objectContaining({ headers: { 'Content-Type': 'application/json' } }),
    );
  });
});

describe('api.post', () => {
  it('sends POST with JSON-serialized body', async () => {
    const mock = stubFetch(201, { id: 2 });
    await api.post('/sessions', { duration_minutes: 30 });
    expect(mock).toHaveBeenCalledWith(
      '/api/sessions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ duration_minutes: 30 }),
      }),
    );
  });

  it('returns the parsed response body', async () => {
    stubFetch(201, { id: 2, duration_minutes: 30 });
    const result = await api.post<{ id: number }>('/sessions', { duration_minutes: 30 });
    expect(result).toEqual({ id: 2, duration_minutes: 30 });
  });
});

describe('api.put', () => {
  it('sends PUT with JSON-serialized body', async () => {
    const mock = stubFetch(200, { id: 1 });
    await api.put('/sessions/1', { duration_minutes: 60 });
    expect(mock).toHaveBeenCalledWith(
      '/api/sessions/1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ duration_minutes: 60 }),
      }),
    );
  });
});

describe('api.delete', () => {
  it('sends DELETE and returns undefined for a 204', async () => {
    const mock = stubFetch(204);
    const result = await api.delete('/sessions/1');
    expect(result).toBeUndefined();
    expect(mock).toHaveBeenCalledWith(
      '/api/sessions/1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

describe('204 handling', () => {
  it('returns undefined without calling .json() for any 204 response', async () => {
    const jsonSpy = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204, json: jsonSpy }));
    const result = await api.get('/noop');
    expect(result).toBeUndefined();
    expect(jsonSpy).not.toHaveBeenCalled();
  });
});

describe('error handling', () => {
  it('throws the server error message when the body has an error field', async () => {
    stubFetch(400, { error: 'duration_minutes is required' });
    await expect(api.post('/sessions', {})).rejects.toThrow('duration_minutes is required');
  });

  it('throws a status fallback message when the body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
    }));
    await expect(api.get('/sessions')).rejects.toThrow('Request failed: 500');
  });

  it('throws a status fallback message when the body has no error field', async () => {
    stubFetch(404, { message: 'not found' });
    await expect(api.get('/sessions/99')).rejects.toThrow('Request failed: 404');
  });
});
