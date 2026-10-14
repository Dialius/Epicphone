import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [preact(), viteSingleFile()],
  root: 'src/frontend',
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
    target: 'es2017',
    // satu berkas mandiri: tidak ada modul terpisah yang perlu di-preload, polyfill-nya hanya menambah ukuran
    modulePreload: { polyfill: false },
    assetsInlineLimit: 1000000,
  },
  define: {
    'import.meta.env.DEV': JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
});
