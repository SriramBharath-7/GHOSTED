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
        const mobileHtml = html.replace('/src/main.js', '/src/mobile.js');
        // The real V7.1.4 native fullscreen window needs a matching WebView
        // viewport that may occupy Android's camera-cutout area.
        // Keep the website's original viewport unchanged.
        const before = 'width=device-width,initial-scale=1.0" name="viewport"';
        if (!mobileHtml.includes(before)) throw Error('Android viewport tag missing');
        return mobileHtml.replace(before,
          'width=device-width,initial-scale=1.0,viewport-fit=cover" name="viewport"');
      }
    }
  }] : [],
}));
