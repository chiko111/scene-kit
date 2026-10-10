import { z } from 'zod';
import {
  EffectSchema,
  MAX_EFFECTS_PER_NODE,
  MAX_NODES,
  NodeSchema,
  SCENE_VERSION,
  SceneSchema,
  type Effect,
  type Scene,
  type SceneNode,
} from './schema';

export type ParseIssue = { path: string; message: string };

export type ParseResult =
  | { ok: true; scene: Scene; warnings: ParseIssue[] }
  | { ok: false; error: string; warnings: ParseIssue[] };

const EnvelopeSchema = SceneSchema.omit({ nodes: true }).extend({
  nodes: z.array(z.unknown()).max(MAX_NODES),
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatIssues(error: z.ZodError, prefix = ''): string {
  return error.issues
    .slice(0, 5)
    .map((issue) => {
      const path = [prefix, ...issue.path.map(String)].filter(Boolean).join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join('; ');
}

/** Keeps valid effects, drops invalid / duplicate / excess ones with a warning. */
function sanitizeEffects(raw: unknown, nodePath: string, warnings: ParseIssue[]): unknown {
  if (!isRecord(raw) || !Array.isArray(raw.effects)) return raw;

  const kept: Effect[] = [];
  raw.effects.forEach((candidate: unknown, i: number) => {
    const path = `${nodePath}.effects[${i}]`;
    const parsed = EffectSchema.safeParse(candidate);
    if (!parsed.success) {
      warnings.push({ path, message: `dropped invalid effect (${formatIssues(parsed.error)})` });
      return;
    }
    if (kept.some((e) => e.type === parsed.data.type)) {
      warnings.push({ path, message: `dropped duplicate "${parsed.data.type}" effect` });
      return;
    }
    if (kept.length >= MAX_EFFECTS_PER_NODE) {
      warnings.push({ path, message: 'dropped: too many effects' });
      return;
    }
    kept.push(parsed.data);
  });

  return { ...raw, effects: kept };
}

/**
 * Tolerant parser for scenes coming from the network.
 *  - Invalid envelope (version, aspectRatio…) → { ok: false } – render a fallback.
 *  - Invalid node / effect → dropped with a warning, the rest still renders.
 *  - Never throws.
 */
export function parseScene(input: unknown): ParseResult {
  let data: unknown = input;

  if (typeof input === 'string') {
    try {
      data = JSON.parse(input);
    } catch {
      return { ok: false, error: 'Invalid JSON', warnings: [] };
    }
  }

  if (isRecord(data) && typeof data.version === 'number' && data.version !== SCENE_VERSION) {
    return {
      ok: false,
      error: `Unsupported scene version ${data.version} (this build supports ${SCENE_VERSION})`,
      warnings: [],
    };
  }

  const envelope = EnvelopeSchema.safeParse(data);
  if (!envelope.success) {
    return { ok: false, error: formatIssues(envelope.error), warnings: [] };
  }

  const warnings: ParseIssue[] = [];
  const seen = new Set<string>();
  const nodes: SceneNode[] = [];

  envelope.data.nodes.forEach((raw, i) => {
    const path = `nodes[${i}]`;
    const parsed = NodeSchema.safeParse(sanitizeEffects(raw, path, warnings));

    if (!parsed.success) {
      warnings.push({ path, message: `dropped invalid node (${formatIssues(parsed.error)})` });
      return;
    }
    if (seen.has(parsed.data.id)) {
      warnings.push({ path, message: `dropped duplicate id "${parsed.data.id}"` });
      return;
    }
    seen.add(parsed.data.id);
    nodes.push(parsed.data);
  });

  return { ok: true, scene: { ...envelope.data, nodes }, warnings };
}

/** Strict validation for saving / exporting. Throws a readable Error. */
export function serializeScene(scene: Scene, pretty = false): string {
  const result = SceneSchema.safeParse(scene);
  if (!result.success) {
    throw new Error(formatIssues(result.error));
  }
  return JSON.stringify(result.data, null, pretty ? 2 : undefined);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => Object.hasOwn(b, k) && deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

export type ValidateResult = { ok: true; scene: Scene } | { ok: false; errors: string[] };

/**
 * Strict validation for backends (before saving). Unlike parseScene, nothing is dropped or
 * stripped silently: unknown properties, invalid nodes/effects or duplicates → ok: false.
 * Same rules as scene.schema.json + the checks JSON Schema cannot express.
 */
export function validateScene(input: unknown): ValidateResult {
  let data: unknown = input;
  if (typeof input === 'string') {
    try {
      data = JSON.parse(input);
    } catch {
      return { ok: false, errors: ['Invalid JSON'] };
    }
  }
  const result = parseScene(data);
  if (!result.ok) return { ok: false, errors: [result.error] };
  if (result.warnings.length > 0) {
    return { ok: false, errors: result.warnings.map((w) => `${w.path}: ${w.message}`) };
  }
  if (!deepEqual(result.scene, data)) return { ok: false, errors: ['scene contains unknown properties'] };
  return { ok: true, scene: result.scene };
}
