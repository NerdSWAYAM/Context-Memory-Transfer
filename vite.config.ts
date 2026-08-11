import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './public/manifest.json';

export default defineConfig({
  envPrefix: ['VITE_', 'OPENROUTER_'],
  build: {
    minify: false,
    modulePreload: false,
  },
  plugins: [crx({ manifest })],
});
