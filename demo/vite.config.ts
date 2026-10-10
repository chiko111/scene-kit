import { defaultClientConditions, defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import basicSsl from '@vitejs/plugin-basic-ssl';

// HTTPS because scene images must be https:// (same rule as production).
export default defineConfig({
  root: __dirname,
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset({ panicThreshold: 'all_errors' })] }),
    basicSsl(),
  ],
  // Use package sources directly in dev (no build step needed).
  resolve: { conditions: ['scene-kit-source', ...defaultClientConditions] },
  server: { port: 5173, strictPort: true },
});
