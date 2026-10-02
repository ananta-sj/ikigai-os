import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages demo build.
//
// This intentionally does not register the production PWA service worker.
// The hosted site is a try-before-install demo; the installable PWA/native
// builds keep using the normal vite.config.ts release path.
export default defineConfig({
  base: '/ikigai-os/',
  plugins: [react()],
  build: {
    sourcemap: false,
    emptyOutDir: true
  }
});
