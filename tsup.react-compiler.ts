import { readFile } from 'node:fs/promises';
import { transformAsync } from '@babel/core';
import type { Plugin } from 'esbuild';

/**
 * Pre-compiles components with React Compiler before bundling, so consumers get
 * auto-memoized code even though bundlers usually skip node_modules for the compiler.
 * panicThreshold 'all_errors' → the build fails instead of silently shipping un-optimized code.
 */
export function reactCompiler(): Plugin {
  return {
    name: 'react-compiler',
    setup(build) {
      build.onLoad({ filter: /\/src\/.*\.tsx?$/ }, async (args) => {
        if (args.path.includes('.test.')) return undefined;
        const source = await readFile(args.path, 'utf8');
        const result = await transformAsync(source, {
          filename: args.path,
          babelrc: false,
          configFile: false,
          sourceMaps: 'inline',
          parserOpts: { plugins: ['jsx', 'typescript'] },
          plugins: [['babel-plugin-react-compiler', { target: '19', panicThreshold: 'all_errors' }]],
        });
        if (!result?.code) throw new Error(`React Compiler produced no output for ${args.path}`);
        return { contents: result.code, loader: args.path.endsWith('.tsx') ? 'tsx' : 'ts' };
      });
    },
  };
}
