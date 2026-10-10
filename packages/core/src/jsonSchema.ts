import { z } from 'zod';
import { SceneSchema } from './schema';

/**
 * JSON Schema (draft 2020-12) generated from the same zod schema the renderers use.
 * Lets non-JS backends (Java, .NET, PHP…) validate scenes with identical rules.
 *
 * Not expressible in JSON Schema — check these in your backend too:
 *  - node ids are unique within a scene
 *  - each effect type appears at most once per node
 *  - navigate.params has at most 10 keys
 *
 * Shipped as `@chiko111/scene-kit-core/scene.schema.json`.
 */
export function sceneJsonSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(SceneSchema, { target: 'draft-2020-12', io: 'output' });
  return {
    $schema: schema.$schema,
    $id: 'https://unpkg.com/@chiko111/scene-kit-core/scene.schema.json',
    title: 'scene-kit scene',
    ...schema,
  };
}
