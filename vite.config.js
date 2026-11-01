import { defineConfig } from 'vite';

// Site and Android share visual assets, but never share the JavaScript entrypoint.
export default defineConfig(({ mode }) => ({
  base: './',
  build: { outDir: mode === 'mobile' ? 'dist-mobile' : 'dist', assetsDir: 'assets' },
  plugins: mode === 'mobile' ? [{
    name: 'ghosted-android-local-entry',
    enforce: 'pre',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        // Vite processes HTML a second time when emitting the bundled page.
        // Replace the source entry before its module graph is scanned.
        return html.replace('/src/main.js', '/src/mobile.js');
      }
    }
  }] : [],
}));
