// Copies scene.schema.json + conformance fixtures from @chiko111/scene-kit-core into the Spring Boot example.
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs';

const core = new URL('../packages/core/', import.meta.url);
const example = new URL('../examples/spring-boot/src/', import.meta.url);

mkdirSync(new URL('main/resources/scene-kit/', example), { recursive: true });
cpSync(new URL('scene.schema.json', core), new URL('main/resources/scene-kit/scene.schema.json', example));

const fixturesOut = new URL('test/resources/fixtures/', example);
rmSync(fixturesOut, { recursive: true, force: true });
mkdirSync(fixturesOut, { recursive: true });
for (const file of readdirSync(new URL('fixtures/', core))) {
  cpSync(new URL(`fixtures/${file}`, core), new URL(file, fixturesOut));
}
console.log('synced schema + fixtures into examples/spring-boot');
