import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/runtime.ts'],
  format: ['esm'],
  target: 'es2022',
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  // dependencies + peerDependencies are external automatically
});
