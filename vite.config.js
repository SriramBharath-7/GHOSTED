import { defineConfig } from 'vite';

export default defineConfig(({mode})=>({
  base: './',
  build: { outDir: mode === 'mobile' ? 'dist-mobile' : 'dist', assetsDir: 'assets' },
  plugins: mode === 'mobile' ? [{
    name: 'ghosted-offline-android-entry',
    transformIndexHtml(html) {
      // Only Android substitutes the entrypoint. Web deployments retain src/main.js.
      if (!html.includes('/src/main.js')) throw Error('GHOSTED entrypoint missing');
      return html.replace('/src/main.js','/src/mobile.js');
    }
  }] : [],
}));
