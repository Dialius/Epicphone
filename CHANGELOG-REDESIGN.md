# Perbaikan UI/UX v3

Tanggal: 14 Oktober 2026. Mengerjakan daftar "Epicphone fix ui/ux" (12 butir + permintaan global) dan hasil audit halaman lain.

## Hasil verifikasi

| Pemeriksaan | Hasil |
|---|---|
| `tsc --noEmit` | 0 error |
| `vitest` | 13 berkas, 192 tes lulus (18 tes baru: detail tukar tambah, beberapa unit dalam satu nota, terbilang, penamaan produk, dokumen cetak) |
| `npm run build` | `Index.html` 399 KB (batas 400 KB tetap terpenuhi) |
| `npm run cek:css` | 0 kelas yatim, 0 variabel yatim, 0 font di bawah 12px |
| `eslint` | 18 galat bawaan `any` (sebelumnya 20); tidak ada galat baru |
| Browser sungguhan (Chromium) | semua halaman dan modal di desktop, HP, dan tema gelap; alur jual 2 unit + tukar tambah sampai nota; hasil cetak nota A5, struk 80mm, dan laporan A4 dicetak ke PDF dan diperiksa |

## Daftar permintaan

| # | Permintaan | Hasil |
|---|---|---|
| 1 | Side nav: tombol ciutkan ke atas dengan ikon panel samping; ikon Servis dan Tagihan tidak di tengah saat ciut | Tombol ada di kepala sidebar (saat ciut tersusun di bawah logo). Penyebabnya penanda titik kosong yang ikut menggeser ikon; kini dipasang melayang di sudut ikon |
| 2 | Garis grafik kartu laba kotor lebih tipis | Garis 1,25 px dengan `non-scaling-stroke` (tidak ikut melebar). Grafiknya juga dulu menggambar omzet; kini menggambar laba |
| 3 | Stok: hapus teks jumlah, pilihan HP/Aksesoris naik, berseberangan dengan Barang masuk | Selesai |
| 4 | Servis: tombol dirapikan | Halaman ditulis ulang: status sebagai kontrol segmen dengan jumlah, jenis sebagai pilihan, satu tombol aksi per kartu, satu tombol utama per modal |
| 5 | Laporan: jarak antar kartu, ikon info tanpa keterangan | Penyebab jarak: kelas `flex-col` tanpa `display:flex`. Ikon info kini komponen `InfoTip` (hover, fokus keyboard, ketuk di HP) |
| 6 | Tombol tema terang/gelap di navbar | Selesai |
| 7 | Penjualan baru: beberapa unit berbeda; form tukar tambah sama dengan unit baru | Pilih beberapa unit, harga tiap unit bisa disesuaikan. Tukar tambah memakai komponen yang sama dengan Barang Masuk (merek, model, varian, warna, IMEI 1 dan 2, kondisi, grade, baterai, kelengkapan, foto) dan backend menyimpannya |
| 8 | Barang masuk: samakan dengan Katalog; catatan opsional | Merek, model, varian, warna terpisah dengan saran dari katalog, nama tersusun otomatis, bisa menambah model ke Katalog sekaligus. Catatan opsional punya bagian sendiri (HP dan Aksesoris) |
| 9 | Pemulihan data: modal, tombol tidak tumpang tindih | Memakai `ModalShell` |
| 10 | Log aktivitas: kartu terlalu mepet | Daftar kartu dengan jarak tetap |
| 11 | Profil toko: form terlalu mepet | Jarak antar isian 20 px |
| 12 | Modal Tambah Katalog tidak bisa di-scroll | Penyebab: `<form>` membungkus header, isi, dan footer. Diperbaiki global (`.sheet-container > form { display: contents }`) dan modal ditulis ulang |
| G | Format uang di semua isian uang | `MoneyInput` (titik ribuan, kursor tidak loncat) dipakai di Servis, Katalog, Biaya, Bayar tagihan, Refund garansi, selain yang sudah ada |
| G | Ikon tab = logo Epic Phone | `setFaviconUrl` di `doGet` (Apps Script mengabaikan tag di dalam halaman) dan tag ikon dari logo untuk mode langsung |
| G | Cetak/PDF profesional | Mesin cetak baru (`lib/cetak.ts`, `lib/dokumen.ts`): nota A5, struk 80mm, laporan A4 dengan terbilang, kolom tanda tangan, nomor halaman. Pratinjau memakai HTML yang sama dengan hasil cetak. Template PDF dari server (nota dan laporan) juga ditulis ulang |

## Temuan audit yang ikut diperbaiki

- Status servis Antri -> Dikerjakan dan Selesai -> Diambil hanya berubah di layar, tidak tersimpan ke server. Kini tersimpan.
- Peringatan "servis selesai" untuk unit toko tidak pernah hilang (unit sudah otomatis Ready). Kini hanya HP pelanggan yang menunggu diambil.
- Estimasi laba di Penjualan baru memotong nilai tukar tambah sehingga bisa tampak rugi; server tidak memotongnya. Kini sama dengan server.
- Laporan memakai kelas bergaya Tailwind yang tidak ada di CSS (warna dan jarak tidak berlaku), kotak "Bandingkan" tidak berfungsi, batang grafik tanpa tinggi, dan mode privasi hanya menyamarkan satu angka. Semuanya diperbaiki.
- Biaya: total "Oktober 2026" tertulis tetap dan menjumlah semua bulan; tanggal diketik manual. Kini bulan berjalan sebenarnya dan tanggal dipilih dari kalender.
- Chip backup di sidebar selalu menulis "Backup 01.00, Drive OK". Kini mengikuti status sebenarnya.
- `MoneyInput`: huruf yang diketik tidak hilang dan kursor loncat ke akhir. Diperbaiki.
- Urutan hook di NotaModal dan DetailTagihanModal (hook setelah `return` awal) dirapikan.
- Mode demo: HP tukar tambah kini ikut masuk ke stok.

## Yang perlu diketahui

- `Index.html` nyaris di batas: 399 KB dari 400 KB. Untuk menjaganya: logo tertanam diperkecil ke 224 px, CSS tak terpakai dibuang (`node scripts/purge-css.mjs`), Galeri komponen hanya ada di build pengembangan, dan ikon memakai pembungkus SVG bersama.
- Foto HP tukar tambah wajib seperti Barang Masuk (depan, belakang, layar menyala untuk bekas).
- Template PDF dari server memakai pengubah HTML ke PDF milik Google; tidak bisa dijalankan di luar Apps Script, jadi tampilannya belum dilihat langsung.

# Redesain UI/UX v2

Tanggal: 5 Oktober 2026. Rencana lengkapnya ada di `docs/RENCANA-REDESIGN-UI-UX.md`; berkas ini mencatat **apa yang benar-benar dikerjakan**, bukti verifikasinya, dan **apa yang belum**.

## Hasil verifikasi

| Pemeriksaan | Hasil |
|---|---|
| `tsc --noEmit` (frontend) | 0 error (sebelumnya 42 error tipe + 35 peringatan) |
| `vitest` | 50 tes lulus (36 lama + 14 baru untuk format, dashboard, nota) |
| Build (`npm run build:single`) | `dist/index.html` 404 KB (anggaran 500 KB) |
| axe-core, 11 halaman x desktop/HP x terang/gelap | 0 pelanggaran kritis, 0 serius, 0 sedang |
| Skenario ujung-ke-ujung (browser sungguhan) | 36 pemeriksaan lulus, 0 error JavaScript |
| Smoke 11 halaman di 1440, 1024, 768, 390 px | tidak ada crash, tidak ada scroll horizontal |
| `npm run cek:css` | 0 kelas yatim, 0 variabel yatim, 0 font di bawah 12px |

Skenario yang diuji: pintasan N / P dan Esc, tombol Back menutup overlay, pencarian global, Pusat Peringatan, jual lunas sampai nota, jual tempo (ditolak tanpa pelanggan dan WA), nomor nota berurutan, tanggal nota dari jam sistem, toast terlihat di atas modal, Barang Masuk beruntun (foto wajib, IMEI duplikat), kontak bertahan antar tab dan muat ulang, bayar tagihan, batalkan transaksi (stok kembali Ready, piutang hilang), garansi dari IMEI penjualan nyata, tema tersimpan.

## Perbaikan bug (Fase 0 di rencana)

| ID | Masalah | Status |
|---|---|---|
| F0-01 | Judul dan ikon header tak terlihat | Selesai |
| F0-02, F0-03 | Pencarian dan Pusat Peringatan crash | Selesai (ditulis ulang; peringatan diturunkan dari data nyata) |
| F0-04 | Menu HP tak pernah terbuka | Selesai (tombol Menu di bilah bawah) |
| F0-05 | Toast tertutup modal | Selesai (z-index 200; di HP pindah ke atas saat modal terbuka) |
| F0-06, F0-07 | 198 kelas dan 18 variabel CSS tanpa definisi | Selesai, dijaga `npm run cek:css` |
| F0-08 | Layout HP rusak (padding global) | Selesai |
| F0-09 | Props tidak cocok antar komponen | Selesai (0 error tipe) |
| F0-10 | Data Kontak/Katalog/Biaya hilang saat pindah tab | Selesai |
| F0-11 | Nota dengan data karangan | Selesai (nomor berurutan, jam WIB, garansi dihitung) |
| F0-12 | Banner draf selalu tampil | Selesai (draf tersimpan nyata per langkah) |
| F0-13 | Hanya 2 aksi terhubung ke backend | **Sebagian**: data demo kini konsisten dan tersimpan; sambungan backend sisanya belum |
| F0-14 | Tombol tanpa efek | Selesai |
| F0-15 | Aksi PDF palsu di Laporan | Selesai (cetak/simpan PDF nyata; "Salin tautan" dihapus) |
| F0-16 sampai F0-19 | Pintasan, Esc bertumpuk, fokus, hooks modal | Selesai |
| F0-20 | `alert()`, foto wajib tak ditegakkan | Selesai |
| F0-21, F0-22 | Timer toast, gambar tanpa cadangan | Selesai |
| F0-23 | Warna status tidak konsisten, ikon sama | Selesai |
| F0-24 | State basi, nilai bisnis tersembunyi | Selesai (harga jual target terlihat dan bisa diedit) |
| F0-25 | Preferensi tidak tersimpan, tak ada hash routing | Selesai (tema, privasi, kepadatan, sidebar; `prefers-color-scheme`; reduced-motion) |
| F0-26 | Angka lonceng dari data contoh | Selesai |

## Yang berubah

**Fondasi.** `styles/tokens.css` (palet berkontras AA, tipografi, spasi, skala z-index, dark mode; nama lama tetap sebagai alias), `ds.css` (reset, shell, komponen), `pages.css`, `utilities.css` (dihasilkan dari kelas utilitas yang masih dipakai), `legacy.css` (sisa aturan lama yang masih dipakai, 581 baris dari 2.918). `base.css`, `responsive.css`, dan `print.css` dihapus; aturan cetak kini ada di `ds.css` (sebelumnya `print.css` tidak pernah dimuat).

**Shell.** Sidebar (empat grup, ikon unik, lencana, bisa diciutkan), rail 72 px di tablet, bilah bawah HP dengan Menu, header dengan judul terlihat dan kolom cari, routing hash, `document.title`, tautan "Lewati ke konten", banner Mode demo, `theme-color`.

**Ditulis ulang.** Beranda (dashboard: laba hari ini dengan pembanding, KPI, perlu perhatian, tren 7 hari SVG, transaksi terakhir, aksi cepat), Stok (toolbar, tabel + panel detail, kartu HP, filter, empty state), Riwayat (per hari, filter jenis dan periode yang bekerja, ringkasan, rincian, CSV), wizard Jual (4 langkah, validasi, draf, piutang wajib pelanggan), Barang Masuk, Batalkan Transaksi, Transaksi Baru, Pencarian, Pusat Peringatan, Menu, `ModalShell`, Toast.

**Diperbaiki, belum ditulis ulang.** Garansi (pencarian dari penjualan nyata, tanpa hasil contoh), Servis (tanggal/ID/IMEI nyata, unit dari Stok mengisi form), Tagihan (tombol Tagih WA), Kontak (Chat WhatsApp, deteksi nomor ganda), Katalog dan Biaya (data bertahan), Laporan (Kunci Bulan sebagai konfirmasi berat, cetak PDF, banner "angka contoh"), Detail Unit, Detail Tagihan, Foto Unit, Nota (perilaku overlay yang benar, foto cadangan).

## Belum dikerjakan

- **Backend.** Hanya `cariStok` dan `simpanPembelian` yang memanggil Apps Script. Jual, bayar, servis, klaim, kontak, biaya, dan pengaturan memakai state lokal (tersimpan di perangkat). Perlu diuji apakah `localStorage` bekerja di iframe Apps Script nyata; bila tidak, data demo hanya bertahan selama sesi.
- **Laporan** masih memakai angka contoh statis (ditandai dengan banner). Belum dihitung dari transaksi.
- **Pengaturan** belum diubah menjadi dua panel; masih deretan tab (kini membungkus, tidak terpotong).
- **Servis** belum berbentuk papan; **Katalog** belum menawarkan "Catat barang masuk model ini".
- **Detail Unit, Detail Tagihan, Foto Unit, Nota** masih memakai markup lama dengan banyak inline style (217 inline style tersisa dari 455); tampilannya sudah memakai token baru.
- Uji di perangkat fisik (Android/iOS), printer termal, dan Apps Script nyata belum dilakukan. Uji visual Playwright tidak dijalankan di lingkungan ini (browser Playwright tidak bisa diunduh); axe-core dijalankan lewat Chromium lain dengan hasil di atas.
- `legacy.css` ditargetkan kosong setelah semua layar dimigrasi.

## Keputusan terbuka (dari rencana)

- **D-05 scrollbar:** tetap disembunyikan sesuai permintaan awal. Rencana mengusulkan scrollbar tipis di desktop saja.
- **D-08 printer nota:** nota dicetak sebagai A5 (`@page` di `ds.css`). Beri tahu lebar kertas printer (58/80 mm) agar tata letak cetak disesuaikan.
- **D-09 peran pemilik/pegawai:** belum ada; mode privasi hanya menyamarkan angka di layar.
- Garansi toko bawaan 7 hari (`lib/nota.ts`); belum terhubung ke Pengaturan > Garansi dan Nota.

## Catatan teknis

- Berkas sumber diubah ke akhir baris LF (sebelumnya CRLF); tidak memengaruhi fungsi.
- Data contoh disimpan di `localStorage` dengan prefiks `epicphone:`. Hapus lewat DevTools > Application bila ingin kembali ke data awal; naikkan `DATA_VERSI` di `app.tsx` bila bentuk data contoh berubah.
- Mode demo aktif otomatis bila tidak ada `window.google` (D008).
- Rute tersembunyi `#/_galeri` menampilkan galeri komponen (dipakai `tests/visual/galeri.spec.ts`).
