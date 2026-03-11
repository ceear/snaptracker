import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE_URL || '/';
  const isDemo = env.VITE_DEMO_MODE === 'true';
  const mockPath = path.resolve(__dirname, 'src/mock/index.js');

  // In demo mode, all @api/* imports resolve to the single mock barrel
  const apiAlias = isDemo
    ? [
        { find: '@api/auth.js', replacement: mockPath },
        { find: '@api/images.js', replacement: mockPath },
        { find: '@api/users.js', replacement: mockPath },
        { find: '@api', replacement: mockPath },
      ]
    : [
        { find: '@api', replacement: path.resolve(__dirname, 'src/api') },
      ];

  return {
    plugins: [react()],
    base,
    resolve: {
      alias: apiAlias,
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});
