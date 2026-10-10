import { describe, expect, it, vi } from 'vitest';
import { createSceneClient } from './client';
import { createButtonNode, createScene } from './factory';
import type { Scene } from './schema';

function scene(id = 'home_1'): Scene {
  return { ...createScene('Test'), id, nodes: [createButtonNode(new Set(), 'Casino')] };
}

function response(status: number, body: string) {
  return { ok: status >= 200 && status < 300, status, text: async () => body };
}

describe('createSceneClient', () => {
  it('loads, validates and caches (same promise for use())', async () => {
    const fetch = vi.fn(async (_url: string, _init: object) => response(200, JSON.stringify(scene())));
    const client = createSceneClient({ loadUrl: (id) => `https://api/scenes/${id}`, fetch });

    const first = client.loadScene('home_1');
    expect(client.loadScene('home_1')).toBe(first);
    expect((await first)?.id).toBe('home_1');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[0]).toBe('https://api/scenes/home_1');
  });

  it('returns null (and does not cache) on 404, invalid JSON or network error', async () => {
    const responses = [response(404, ''), response(200, '{nope'), response(200, '{"version":9}')];
    const fetch = vi.fn(async () => responses.shift() ?? response(200, JSON.stringify(scene())));
    const client = createSceneClient({ loadUrl: (id) => `/s/${id}`, fetch });
    expect(await client.loadScene('home_1')).toBeNull();
    expect(await client.loadScene('home_1')).toBeNull();
    expect(await client.loadScene('home_1')).toBeNull();
    expect(await client.loadScene('home_1')).not.toBeNull();

    const failing = createSceneClient({ loadUrl: (id) => `/s/${id}`, fetch: async () => Promise.reject(new Error('offline')) });
    expect(await failing.loadScene('home_1')).toBeNull();
  });

  it('never requests ids that are not path-safe', async () => {
    const fetch = vi.fn();
    const client = createSceneClient({ loadUrl: (id) => `/s/${id}`, fetch });
    expect(await client.loadScene('../admin')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('saves with headers, validates first, surfaces server errors', async () => {
    const fetch = vi.fn(async (_url: string, _init: object) => response(204, ''));
    const client = createSceneClient({
      loadUrl: (id) => `/s/${id}`,
      saveUrl: (id) => `/s/${id}`,
      headers: async () => ({ Authorization: 'Bearer t' }),
      fetch,
    });
    await client.saveScene(scene());
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe('/s/home_1');
    expect(init).toMatchObject({ method: 'PUT', headers: { Authorization: 'Bearer t', 'Content-Type': 'application/json' } });

    await expect(client.saveScene({ ...scene(), aspectRatio: 99 })).rejects.toThrow(/aspectRatio/);
    expect(fetch).toHaveBeenCalledTimes(1);

    const denied = createSceneClient({
      loadUrl: (id) => id,
      saveUrl: (id) => id,
      fetch: async () => response(403, '{"error":"Not allowed"}'),
    });
    await expect(denied.saveScene(scene())).rejects.toThrow('Not allowed');
  });

  it('upload expects an https url', async () => {
    const ok = createSceneClient({ loadUrl: (id) => id, uploadUrl: '/up', fetch: async () => response(201, '{"url":"https://cdn/x.webp"}') });
    expect(await ok.uploadAsset(new Blob(['x']))).toBe('https://cdn/x.webp');

    const http = createSceneClient({ loadUrl: (id) => id, uploadUrl: '/up', fetch: async () => response(201, '{"url":"http://cdn/x.webp"}') });
    await expect(http.uploadAsset(new Blob(['x']))).rejects.toThrow(/https/);

    const none = createSceneClient({ loadUrl: (id) => id });
    await expect(none.uploadAsset(new Blob(['x']))).rejects.toThrow(/paste an image URL/);
  });
});
