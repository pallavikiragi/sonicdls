import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index'
    },
    rollupOptions: {
  external: (id) =>
  id === 'react' || id.startsWith('react/') ||
  id === 'react-dom' || id.startsWith('react-dom/') ||
  id === 'tone' || id.startsWith('tone/')
}
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.')
    }
  }
});
