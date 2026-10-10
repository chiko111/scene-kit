import { defineConfig } from 'tsup';
import { reactCompiler } from '../../tsup.react-compiler';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'es2022',
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  esbuildPlugins: [reactCompiler()],
  // dependencies + peerDependencies are external automatically
});
