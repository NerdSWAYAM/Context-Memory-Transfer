import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifestJson from './public/manifest.json';

const browser = process.env.BROWSER || 'chrome';
const isFirefox = browser === 'firefox';

const manifest = { ...manifestJson } as any;

if (isFirefox) {
  if (manifest.background && manifest.background.service_worker) {
    manifest.background = {
      scripts: [manifest.background.service_worker],
      type: "module"
    };
  }
} else {
  // For Chrome/Chromium, use service_worker
  if (manifest.background && manifest.background.scripts && manifest.background.scripts.length > 0) {
    manifest.background = {
      service_worker: manifest.background.scripts[0],
      type: "module"
    };
  }
}

export default defineConfig({
  envPrefix: ['VITE_', 'OPENROUTER_'],
  base: '',
  build: {
    minify: false,
    modulePreload: false,
  },
  plugins: [
    crx({ 
      manifest,
      browser: isFirefox ? 'firefox' : 'chrome'
    }),
    {
      name: 'remove-crossorigin',
      transformIndexHtml(html) {
        return html.replace(/ crossorigin/g, '');
      }
    }
  ],
});
