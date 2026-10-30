import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    minify: 'esbuild',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // ✅ Group React AND its scheduler together to prevent MessageChannel error
            if (
              id.includes('react') || 
              id.includes('scheduler') || 
              id.includes('loose-envify') || 
              id.includes('js-tokens')
            ) {
              return 'vendor-react';
            }
            // Group other big libraries
            if (id.includes('@tanstack')) return 'vendor-tanstack';
            if (id.includes('lucide')) return 'vendor-icons';
            
            // Everything else goes to the main vendor chunk
            return 'vendor';
          }
        },
      },
    },
  },
});
