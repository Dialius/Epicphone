// Tipe untuk konstanta build yang didefinisikan di vite.config.ts (define: import.meta.env.DEV).
// DEV bernilai false pada build produksi, sehingga kode khusus pengembangan (mis. Galeri komponen) terbuang dari Index.html.
interface ImportMeta {
  readonly env: { readonly DEV: boolean };
}
