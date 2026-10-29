import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    minify: 'esbuild', // ✅ Back to fast production build
    sourcemap: false,  // ✅ Saves Vercel bandwidth
    chunkSizeWarningLimit: 4000,
  },
});
