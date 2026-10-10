import { defineConfig, defaultServerConditions } from 'vite';

// Tests run against src/ (no build needed) via the "scene-kit-source" export condition.
export default defineConfig({
  resolve: { conditions: ['scene-kit-source', ...defaultServerConditions] },
  ssr: { resolve: { conditions: ['scene-kit-source', ...defaultServerConditions] } },
  test: { include: ['packages/*/src/**/*.test.ts'] },
});
