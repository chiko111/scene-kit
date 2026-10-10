import { parseScene, validateScene } from './parse';
import type { Scene } from './schema';

type Headers = Record<string, string>;

/** The minimal fetch surface used (works with browser, React Native and Node 18+ fetch). */
type FetchLike = (
  url: string,
  init: {
    method: string;
    headers: Headers;
    body?: string | FormData;
    credentials?: 'omit' | 'same-origin' | 'include';
    signal?: AbortSignal;
  },
) => Promise<{
  ok: boolean;
  status: number;
  text(): Promise<string>;
}>;

export type SceneClientOptions = {
  /** GET → scene JSON. E.g. (id) => `https://api.example.com/scenes/${id}` */
  loadUrl: (id: string) => string;
  /** Saves the scene JSON (back office only). E.g. (id) => `https://api.example.com/scenes/${id}` */
  saveUrl?: (id: string) => string;
  /** Default 'PUT'. */
  saveMethod?: 'PUT' | 'POST';
  /** Optional image upload (multipart field "file"); must respond {"url": "https://…"}. */
  uploadUrl?: string;
  /** Extra headers for every request, e.g. an auth token. May be async (token refresh). */
  headers?: () => Headers | Promise<Headers>;
  /** 'include' for cookie-based back-office sessions on another domain. */
  credentials?: 'omit' | 'same-origin' | 'include';
  /** How long a loaded scene is reused (ms). Default 60 000. */
  cacheMs?: number;
  /** Request timeout (ms). Default 15 000. */
  timeoutMs?: number;
  /** Custom fetch (tests, SSR). Defaults to the global fetch. */
  fetch?: FetchLike;
};

export type SceneClient = {
  /**
   * Scene or null (not found, network error, invalid JSON — the slot just stays empty).
   * Returns the SAME promise for the same id while cached, so it is safe to pass to React's use().
   */
  loadScene: (id: string) => Promise<Scene | null>;
  /** Drop cached scenes (all, or one id) — e.g. on pull-to-refresh. */
  invalidate: (id?: string) => void;
  /** Validates strictly, then sends. Throws Error(message from server) on failure. Use as SceneEditor onSave. */
  saveScene: (scene: Scene) => Promise<void>;
  /** Uploads an image, resolves with its URL. Use as SceneEditor onUpload. */
  uploadAsset: (file: Blob) => Promise<string>;
};

const SCENE_ID = /^[A-Za-z0-9_-]{1,64}$/;

async function errorMessage(res: { status: number; text(): Promise<string> }): Promise<string> {
  try {
    const text = await res.text();
    try {
      const json: unknown = JSON.parse(text);
      if (json && typeof json === 'object' && 'error' in json && typeof json.error === 'string') return json.error;
    } catch {
      // not JSON
    }
    if (text.trim()) return `HTTP ${res.status}: ${text.trim().slice(0, 200)}`;
  } catch {
    // body unreadable
  }
  return `HTTP ${res.status}`;
}

/**
 * Talks to the two (or three) endpoints your backend exposes. The backend only stores and returns
 * JSON — validation happens here (before save) and in parseScene (before render).
 */
export function createSceneClient(options: SceneClientOptions): SceneClient {
  const cacheMs = options.cacheMs ?? 60_000;
  const timeoutMs = options.timeoutMs ?? 15_000;
  const cache = new Map<string, { promise: Promise<Scene | null>; expires: number }>();

  const doFetch: FetchLike = options.fetch ?? ((url, init) => fetch(url, init));

  async function request(url: string, method: string, body?: string | FormData, json = false) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers: Headers = { ...(await options.headers?.()) };
      if (json) headers['Content-Type'] = 'application/json';
      return await doFetch(url, { method, headers, body, credentials: options.credentials, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchScene(id: string): Promise<Scene | null> {
    try {
      const res = await request(options.loadUrl(id), 'GET');
      if (!res.ok) return null;
      const result = parseScene(await res.text());
      return result.ok ? result.scene : null;
    } catch {
      return null;
    }
  }

  return {
    loadScene(id) {
      if (!SCENE_ID.test(id)) return Promise.resolve(null);
      const now = Date.now();
      const hit = cache.get(id);
      if (hit && hit.expires > now) return hit.promise;

      const promise = fetchScene(id).then((scene) => {
        // don't keep failures around: next mount retries
        if (scene === null) cache.delete(id);
        return scene;
      });
      cache.set(id, { promise, expires: now + cacheMs });
      return promise;
    },

    invalidate(id) {
      if (id === undefined) cache.clear();
      else cache.delete(id);
    },

    async saveScene(scene) {
      if (!options.saveUrl) throw new Error('saveUrl is not configured');
      const result = validateScene(scene);
      if (!result.ok) throw new Error(result.errors[0] ?? 'Invalid scene');
      const res = await request(options.saveUrl(scene.id), options.saveMethod ?? 'PUT', JSON.stringify(result.scene), true);
      if (!res.ok) throw new Error(await errorMessage(res));
      cache.delete(scene.id);
    },

    async uploadAsset(file) {
      if (!options.uploadUrl) throw new Error('Image upload is not configured — paste an image URL instead');
      const body = new FormData();
      body.append('file', file);
      const res = await request(options.uploadUrl, 'POST', body);
      if (!res.ok) throw new Error(await errorMessage(res));
      let url: unknown;
      try {
        url = (JSON.parse(await res.text()) as { url?: unknown }).url;
      } catch {
        throw new Error('Upload response must be JSON {"url": "https://…"}');
      }
      if (typeof url !== 'string' || !url.startsWith('https://')) {
        throw new Error('Upload response must contain an https:// "url"');
      }
      return url;
    },
  };
}
