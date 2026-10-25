import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

// Bust the service worker cache on every build so users get fresh assets
const swCacheVersion = `card-hub-shell-${Date.now()}`;
const swVersionPlugin = () => ({
  name: 'sw-cache-version',
  closeBundle() {
    const outDir = path.resolve(__dirname, 'dist');
    const swPath = path.join(outDir, 'sw.js');
    if (fs.existsSync(swPath)) {
      const src = fs.readFileSync(swPath, 'utf8');
      fs.writeFileSync(swPath, src.replace(/__CACHE_VERSION__/g, swCacheVersion));
    }
  },
});

export default defineConfig({
  plugins: [react(), swVersionPlugin()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
      '/images': 'http://localhost:8080',
    },
  },
});
