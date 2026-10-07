import { webSecurity } from './scripts/web-security.mjs';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [webSecurity({ connectSources: ["https://api.openai.com","https://generativelanguage.googleapis.com","https://*.blob.core.windows.net"] })],
  server: {
    port: 5175,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
  },
});
