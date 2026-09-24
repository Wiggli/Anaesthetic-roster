import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Explicitly ship only the old public shell and its assets. Source, tests,
// migrations and local credentials are never copied into the Pages artifact.
const publicFiles = [
  'styles.css', 'chat.css', 'theme-bootstrap.js', 'app-core.js', 'app-ui.js', 'push.js', 'chat.js',
  'manifest.webmanifest', 'release.json', 'anaesthesia-header.jpg',
  'mater-dei-logo.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'
];

function legacyShell(): Plugin {
  return {
    name: 'reviewed-legacy-shell',
    generateBundle() {
      for (const fileName of publicFiles) {
        this.emitFile({ type: 'asset', fileName, source: readFileSync(fileName) });
      }
    }
  };
}

export default defineConfig({
  base: './',
  publicDir: false,
  plugins: [
    react(),
    tailwindcss(),
    legacyShell(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: '.',
      filename: 'service-worker.js',
      injectRegister: false,
      manifest: false,
      injectManifest: { globPatterns: ['assets/**/*.{js,css}'], minify: false }
    })
  ]
});
