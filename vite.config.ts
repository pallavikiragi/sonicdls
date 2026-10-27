import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    base: process.env.GITHUB_ACTIONS ? '/sonicdls/' : '/',
    plugins: [react(), tailwindcss()],
    build: {
      outDir: 'dist-site',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('/node_modules/tone/')) {
              return 'tone';
            }
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});