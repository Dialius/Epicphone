# PRD 04 – Frontend, Build Satu Berkas, dan Responsif

Versi 1.0 | Mengacu ke PRD 00 sampai 03

## 1. Tujuan

Seluruh sistem dikemas sesesimpel mungkin: tampilan (UI) menjadi **satu berkas `index.html`** (JavaScript dan CSS tertanam di dalamnya), logika server menjadi **satu berkas `Code.gs`**, dan data tetap tersimpan di Google Spreadsheet dan Drive.

**Catatan penting tentang "semua dalam satu berkas":** data transaksi tidak bisa hidup di dalam berkas HTML, karena HTML hanya kode tampilan. Database tetap Spreadsheet (sesuai PRD 01). Yang dijadikan satu berkas adalah seluruh kode aplikasinya.

## 2. Mode Pengemasan

| Mode | Berkas di proyek Apps Script | Kapan dipakai |
|---|---|---|
| **A. Dua berkas (rekomendasi)** | `Code.gs` + `index.html` | Standar. Aman, mudah di-debug, deploy lewat `clasp` |
| **B. Satu berkas** | Hanya `Code.gs`; HTML tertanam sebagai teks di dalamnya | Jika ingin benar-benar satu berkas atau salin-tempel ke editor Apps Script. Uji batas ukuran berkas saat build; jika ditolak, pakai mode A |

Skrip build menghasilkan kedua mode dari kode sumber yang sama (`npm run build:gas` untuk A, `npm run build:single` untuk B).

## 3. Pilihan Tooling dan Rekomendasi

| Opsi | Kelebihan | Kekurangan | Penilaian |
|---|---|---|---|
| **Vite + Preact + `vite-plugin-singlefile`** | Hasil satu HTML otomatis, bundle sangat kecil (Preact sekitar 4 KB), dev server cepat, TypeScript siap | Perlu Node.js di laptop | **Direkomendasikan** |
| Vite + Svelte + singlefile | Bundle paling kecil, sintaks ringkas | Ekosistem lebih kecil dari React/Preact | Alternatif bagus |
| Vite + React + singlefile | Ekosistem terbesar | Bundle lebih berat (sekitar 45 KB) | Pilih bila sudah terbiasa React |
| Tanpa build (Alpine.js / Preact + htm) | Tanpa Node, edit langsung | Sulit dirawat untuk 9 modul, tanpa TypeScript | Hanya untuk prototipe |
| Parcel / esbuild manual | Konfigurasi minimal | Inline satu berkas perlu skrip tambahan | Tidak perlu jika Vite sudah cukup |

**Keputusan stack:** Vite + Preact + TypeScript + `vite-plugin-singlefile`; CSS murni dengan design tokens PRD 02 (tanpa framework CSS besar); grafik dibuat dari SVG buatan sendiri (batang dan garis sederhana); ikon SVG tertanam.

## 4. Struktur Repositori

```
epicphone-sistem/
  package.json  vite.config.ts  tsconfig.json  .clasp.json  appsscript.json
  src/
    frontend/
      main.tsx  app.tsx
      routes/        beranda, stok, transaksi, tagihan, laporan, pengaturan
      components/    kartu, chip-status, tombol, bottom-sheet, dialog, tabel, form-uang, wizard
      styles/        tokens.css (warna brand EPICPHONE)  base.css  responsive.css  print.css
      lib/           api.ts  format.ts  validasi.ts  draft.ts  router.ts  foto.ts
      mock/          data-contoh.ts   (untuk dev tanpa Apps Script)
    backend/         Code.ts  *.service.ts  (PRD 03)
  scripts/           build-gas.mjs  build-single.mjs  gas-exports.mjs
  tests/             unit/  e2e/
  dist/              index.html  Code.js  appsscript.json
```

## 5. Alur Build dan Deploy

1. `npm run dev` : UI jalan di laptop memakai data contoh (mock), tanpa Apps Script.
2. `npm run build:gas` :
   - Vite membangun `dist/index.html` (satu berkas, semua JS/CSS inline).
   - esbuild membundel backend TypeScript menjadi `dist/Code.js`.
   - `gas-exports.mjs` membuat fungsi pembungkus tingkat atas (`function simpanPenjualan(d){...}`) karena `google.script.run` hanya bisa memanggil fungsi global.
3. `npm run build:single` : seperti langkah 2, lalu `index.html` disisipkan ke `Code.js` sebagai teks dan `doGet` memakai `HtmlService.createHtmlOutput(teks)`.
4. `clasp push` lalu **Deploy > Web app** (Execute as: Me, Access: Only myself).
5. Setiap rilis diberi nomor versi (PRD 07).

## 6. Penyajian di Apps Script (Wajib Diperhatikan)

1. **Viewport wajib ditambahkan dari server:** `HtmlService...addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')`. Tanpa ini tampilan HP tidak responsif.
2. Web app berjalan di dalam iframe: tidak ada akses ke URL asli halaman, jadi navigasi memakai **hash router** (`#/stok/UNT-2610-0007`), bukan History API.
3. Semua aset **tertanam**: font sistem (tanpa Google Fonts), ikon SVG inline, gambar kecil sebagai data URI. Tidak ada CDN.
4. Service worker/PWA penuh tidak tersedia di lingkungan ini. Pengganti: owner memakai "Tambahkan ke layar utama" pada URL web app; draf form disimpan di penyimpanan peramban (dibungkus `try/catch`, ada cadangan di memori).
5. Judul tab dan ikon diatur dari server (`setTitle`, `setFaviconUrl`).

## 7. Komunikasi Frontend dan Backend

1. `lib/api.ts` membungkus `google.script.run` menjadi Promise dengan tipe respons seragam `{ ok, data | kode, pesan }` (PRD 03).
2. Jika `google` tidak ada (mode dev), `api.ts` otomatis memakai `mock/`.
3. **Kunci anti-ganda (`idemKey`):** setiap penyimpanan membawa kunci unik; server menolak kunci yang sama dalam 10 menit. Mencegah transaksi ganda saat tombol ditekan dua kali atau koneksi mengulang.
4. Pembacaan boleh diulang otomatis 1 kali; penulisan tidak pernah diulang otomatis.
5. Batas waktu 30 detik per panggilan, lalu tampil pesan "Gagal menyimpan, coba lagi" (PRD 02 bagian 7).
6. Data master (produk, kontak, referensi) dimuat sekali saat aplikasi dibuka, disimpan di memori, dan diperbarui setelah perubahan.

## 8. Strategi Responsif (Teknis)

| Aspek | Ketentuan |
|---|---|
| Pendekatan | Mobile-first; CSS memakai `min-width` media query |
| Breakpoint | 360 (HP), 600 (HP besar/tablet kecil), 1024 (laptop), 1440 (desktop) |
| Lebar minimum | 320 px tanpa gulir horizontal |
| Tata letak | CSS Grid dan Flexbox; satuan `rem`, `%`, `clamp()` untuk tipografi |
| Tinggi layar | `100dvh`, bukan `100vh` (bilah alamat peramban HP) |
| Area aman | `env(safe-area-inset-*)` untuk notch dan bilah gestur |
| Input | `inputmode="numeric"` untuk uang dan IMEI; `autocomplete` sesuai; ukuran font input minimal 16 px (mencegah zoom otomatis iOS) |
| Hover | Efek hover hanya dalam `@media (hover: hover)` |
| Gerak | Hormati `prefers-reduced-motion` |
| Tema | `prefers-color-scheme` untuk mode gelap |
| Cetak | `@media print` untuk nota A5 dan laporan |

Detail tata letak per ukuran layar ada di PRD 02 bagian 11.

## 9. Target Ukuran dan Performa

| Metrik | Target |
|---|---|
| Ukuran `index.html` | Di bawah 400 KB (tanpa kompresi) |
| Muat awal (4G) | Di bawah 3 detik sampai tampilan skeleton, di bawah 5 detik sampai data |
| Navigasi antar layar | Instan (data master sudah di memori) |
| Daftar panjang | Virtualisasi/penomoran halaman 50 baris |
| Interaksi | Respons ketukan di bawah 100 ms |

Karena semuanya satu berkas, tidak ada pemisahan kode (code splitting); ukuran dijaga dengan menghindari pustaka besar.

## 10. Kualitas Kode

1. TypeScript mode ketat, ESLint, Prettier.
2. Tipe data bersama antara frontend dan backend (satu berkas `types.ts`) agar bentuk data tidak melenceng.
3. Uji unit (Vitest): format uang/tanggal, validasi IMEI, perhitungan total dan sisa.
4. Uji tampilan (Playwright) pada viewport 320, 360, 390, 412, 768, 1024, 1280, 1536 px.
5. Larangan: pustaka UI besar, dependensi yang butuh jaringan saat berjalan, `eval`.

## 11. Unggah Foto dari Peramban

1. Input file memakai atribut kamera di HP (`accept="image/*"`, `capture` opsional) dan pemilih berkas/seret-lepas di laptop.
2. `lib/foto.ts` mengoreksi arah foto (EXIF), memperkecil sisi terpanjang ke 1600 px, dan mengekspor JPEG kualitas sekitar 0,8 lewat canvas; target di bawah 400 KB.
3. Foto dikirim satu per satu (base64) ke `unggahFoto` dengan `idemKey`, progres per foto, antrean dengan Coba Lagi.
4. Nama berkas tidak dibuat di frontend; frontend hanya mengirim posisi/tahap dan menampilkan nama dari server.
5. Logo EPICPHONE tertanam sebagai data URI hasil optimasi (sekitar 30 KB) dan warna brand didefinisikan sebagai variabel CSS di `tokens.css`.

## 12. Kriteria Penerimaan

1. `npm run build:gas` menghasilkan `index.html` tunggal dan `Code.js` yang berfungsi setelah `clasp push`.
2. `npm run build:single` menghasilkan satu `Code.js` yang bisa disalin ke editor Apps Script dan berjalan (atau pesan jelas bila ukuran melebihi batas).
3. Aplikasi tampil benar tanpa gulir horizontal pada 320 sampai 1920 px.
4. Mode dev berjalan penuh dengan data contoh tanpa Apps Script.
5. Penekanan ganda tombol Simpan tidak membuat transaksi ganda.
6. Ukuran `index.html` sesuai target bagian 9 (termasuk logo).
7. Foto 4 MB dari kamera HP terunggah sebagai file di bawah 400 KB dengan arah yang benar.
