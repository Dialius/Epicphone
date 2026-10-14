# DECISIONS.md — Keputusan teknis yang diambil selama pengembangan

## Keputusan yang diambil

### D001 — Mode pengemasan: Mode A (dua berkas)
**Konteks:** PRD menawarkan Mode A (Code.js + index.html) dan Mode B (satu Code.js).
**Keputusan:** Mode A sebagai default build:gas. Mode B tetap tersedia via build:single.
**Alasan:** Lebih mudah di-debug, ukuran berkas tidak melewati batas Apps Script, deploy lebih cepat.

### D002 — setupAwal() membuat Spreadsheet baru dari nol
**Konteks:** Bisa memakai Spreadsheet yang sudah ada atau membuat baru.
**Keputusan:** setupAwal() membuat Spreadsheet baru di Drive.
**Alasan:** Tidak ada Spreadsheet yang sudah ada; owner memulai sistem dari nol.

### D003 — Logo: placeholder SVG dulu
**Konteks:** File Logo-epicphone.jpg tersedia (60 KB) tapi perlu dioptimasi ke ~30 KB dan dikonversi ke data URI.
**Keputusan:** Logo dijadikan data URI saat Langkah 3 (frontend kerangka) setelah optimasi.
**Alasan:** Scaffold tidak boleh bergantung pada proses optimasi gambar; dikerjakan terpisah.

### D004 — Kolom dipetakan berdasarkan nama header
**Konteks:** Bisa pakai nomor kolom atau nama header.
**Keputusan:** Nama header (PRD 03 bagian 3).
**Alasan:** Aman jika kolom bergeser; lebih mudah dibaca dan dirawat.

### D005 — Font sistem, tanpa Google Fonts
**Konteks:** PRD mensyaratkan aset tertanam, tanpa CDN.
**Keputusan:** `system-ui, -apple-system, sans-serif` — font bawaan OS.
**Alasan:** Nol dependensi jaringan saat runtime; ukuran index.html tetap kecil.

### D006 — Kompresi Foto di Client Sisi Browser
**Konteks:** Mengunggah foto berukuran kamera asli (3-10 MB) menghabiskan kuota Apps Script dan memperlambat transmisi.
**Keputusan:** Resize sisi terpanjang maksimal 1600px via canvas, kompres JPEG kualitas 0.8, ekspor base64 di bawah 400 KB.
**Alasan:** Sesuai PRD 04 bagian 11 & PRD 09, mencegah timeout HTTP Apps Script.

### D007 — UI Tidak Navigasi Otomatis (OnBack/Exit) Setelah Simpan
**Konteks:** Mode input di konter membutuhkan entri unit beruntun yang cepat tanpa pindah-pindah layar.
**Keputusan:** Form tetap terbuka, reset isian unit baru (menjaga isian model/supplier jika diinginkan), dan umpan balik via toast melayang di atas.
**Alasan:** Sesuai aturan ergonomi konter satu tangan dan instruksi user profile.

### D008 — Mock Dev Mode Otomatis Tanpa Apps Script
**Konteks:** Pengembangan dan pengujian di laptop lokal perlu berjalan tanpa koneksi live google.script.run.
**Keputusan:** `api.ts` mendeteksi keberadaan objek `window.google`. Jika tidak ada, fungsi CRUD beralih ke state lokal / localStorage.
**Alasan:** Pengujian cepat, uji visual responsif, dan fleksibilitas tanpa perlu login Google setiap saat.

### D009 — Arsitektur CSS v2: Token, Desain Sistem, dan Sisa Lama yang Dipangkas
**Konteks:** CSS lama (base.css 2.357 baris + responsive.css 561 baris) berlapis tambalan, memakai 49 `!important`, 18 variabel yang tidak pernah didefinisikan, dan 198 nama kelas JSX tanpa definisi (136 bergaya Tailwind padahal Tailwind tidak dipakai).
**Keputusan:** `tokens.css` (satu sumber nilai, nama lama tetap sebagai alias), `ds.css` (reset, shell, komponen bersama), `pages.css` (gaya khusus halaman), `utilities.css` (dihasilkan dari kelas utilitas yang masih dipakai di JSX), dan `legacy.css` (sisa aturan lama yang masih dipakai layar yang belum dimigrasi). `scripts/cek-css.mjs` (`npm run cek:css`) gagal bila ada kelas atau variabel yatim, font di bawah 12px, atau dist melewati 500 KB.
**Alasan:** Mengganti desain tanpa memperbaiki fondasi hanya memindahkan masalah. Tujuan akhir: `legacy.css` kosong dan dihapus setelah semua layar dimigrasi.

### D010 — Data Demo Bertahan di localStorage, Aksi Mengubah Satu Sumber State
**Konteks:** Kontak, Katalog, dan Biaya menyimpan data di state lokal komponen sehingga hilang saat pindah tab; nota memakai tanggal, nomor, dan garansi karangan.
**Keputusan:** Semua daftar data diangkat ke `app.tsx` dan disimpan lewat `usePersist` (localStorage dengan cadangan memori). Penjualan, pembayaran, pembatalan, servis selesai, dan barang masuk mengubah daftar yang sama dengan yang tampil di layar. Nota, tanggal, nomor dokumen, dan angka dashboard diturunkan dari data/jam sistem (WIB). Layar menampilkan banner "Mode demo" saat tidak ada Apps Script.
**Alasan:** Data tidak boleh palsu. Catatan: hanya dua aksi (`cariStok`, `simpanPembelian`) yang terhubung ke backend; sambungan sisanya adalah pekerjaan terpisah. localStorage di iframe Apps Script perlu diuji di deployment nyata.

### D011 — Overlay Ditumpuk: Esc, Back, Kunci Scroll, Fokus
**Konteks:** Esc menutup semua modal sekaligus, tombol Back browser berpindah halaman, modal tidak memindahkan fokus, dan toast (z-index sama dengan modal) tertutup modal.
**Keputusan:** `lib/overlay.ts` mengelola tumpukan overlay (Esc dan Back hanya menutup yang teratas, scroll body dikunci, fokus terjebak dan dikembalikan). Semua modal baru memakai `ModalShell`; modal lama memakai `useOverlay`. Toast berada di `z-index: 200` (di atas modal) dan di HP pindah ke atas layar saat modal terbuka.
**Alasan:** Menjaga D007 (umpan balik toast di atas form) benar-benar berfungsi.

### D012 — Navigasi: Hash Routing dan Menu di HP
**Konteks:** Menu Lengkap di HP tidak pernah bisa dibuka sehingga 7 halaman tidak terjangkau; tidak ada routing sehingga tombol Back tidak berguna.
**Keputusan:** Rute hash (`#/stok`, `#/pengaturan/backup`), bilah bawah HP berisi Beranda, Stok, tombol Transaksi baru, Riwayat, dan Menu. Tema, privasi, kepadatan tabel, dan status sidebar tersimpan. Rute tersembunyi `#/_galeri` untuk galeri komponen (tes visual).
**Alasan:** Panduan navigasi 2 sampai 5 tujuan utama di layar kecil; sisanya di menu.

### D013 — Backend Tersambung: Server Jadi Sumber Kebenaran di Mode Nyata
**Konteks:** Sebelumnya hanya `cariStok` dan `simpanPembelian` yang terhubung; fungsi backend juga tidak pernah benar-benar bisa dipanggil (bundel esbuild membungkus semuanya dalam IIFE sehingga `google.script.run` dan trigger tidak menemukan satu pun fungsi selain `doGet`).
**Keputusan:**
1. `scripts/gas-wrappers.mjs` membuat pembungkus global untuk setiap `export function` di `Code.ts` (Mode A dan B).
2. Satu panggilan `getSemuaData()` membawa stok, aksesoris, transaksi, tagihan, kontak, dan katalog dalam model layar; layar memuatnya saat dibuka dan saat aplikasi kembali tampil (maks. sekali per menit). Ini menyimpang dari PRD-03 yang memuat `getBeranda()`: dashboard tetap dihitung di layar dari daftar yang sama.
3. Aksi tulis (`simpanPembelian`, `simpanPenjualan`, `terimaPembayaran`, `batalkanTransaksi`, `simpanKontak`, `simpanProduk`) memakai `idemKey`, satu `LockService` bersarang aman (`Lock.ts`), dan jurnal rollback (`Db.transaksi`). Setelah sukses layar memuat ulang daftar dari server, bukan menambal state lokal.
4. Mode nyata tidak memakai localStorage untuk data milik server dan tidak menampilkan data contoh. Mode demo tidak berubah.
5. Tanggal disimpan sebagai teks ISO (`yyyy-MM-dd`, `HH:mm`); kolom tanggal/jam/IMEI/WA diformat teks agar Sheets tidak mengubahnya. `google.script.run` tidak bisa membawa `Date`, sehingga pembaca data mengubah semua `Date` menjadi teks.
**Belum tersambung (masih lokal di perangkat, ada banner di layarnya):** Servis, Garansi/Klaim, Biaya Operasional, serta pratinjau Foto Unit. Foto diunggah ke Drive saat barang masuk, tetapi belum bisa ditampilkan kembali dari server.
**Asumsi yang perlu dikonfirmasi dengan PRD 01/02/04:** rumus laba penjualan (`subtotal - diskon - HPP - biaya bonus`, nilai tukar tambah tidak mengurangi laba karena unitnya masuk stok dengan HPP sebesar nilai itu), harga jual target unit tukar tambah (`nilai × 1,15` seperti default layar), garansi (baru 12 bulan, bekas 7 hari, aksesoris 3 hari dari `Config.GARANSI_DEFAULT`).


### D014 — Desain Sheet dari Satu Skema, Tiga Berkas Apps Script, Modul Lengkap
**Konteks:** PRD 00-09 kini tersedia. Setup lama hanya menulis header; format, lebar, dropdown, warna status, dan proteksi belum ada. Servis, Garansi/Klaim, Biaya, Nota PDF, Laporan, Foto lanjutan, dan backup mingguan belum ada atau masih angka contoh di layar.
**Keputusan:**
1. `src/backend/Skema.ts` adalah satu-satunya sumber desain sheet (kolom, urutan, tipe, lebar, dropdown, warna status). `SetupSheets.gs` membangun sheet darinya; `Db.ts` memakainya untuk menulis nilai dalam tipe yang benar (tanggal asli, angka asli, IMEI/WA/ID sebagai teks); `docs/SKEMA-SHEET.md` dibuat otomatis (`npm run dok:skema`).
2. Tanggal disimpan sebagai tanggal asli bertampilan `dd MMM yyyy` (lokal `id_ID` agar Okt/Agu/Des), jam sebagai teks `HH:mm`, uang sebagai angka berformat Rupiah. Di dalam kode tanggal tetap teks ISO; konversi hanya di `Db.ts`.
3. Hasil build mengikuti proyek Apps Script: `Code.gs`, `SetupSheets.gs`, `Index.html` (satu berkas HTML, JS/CSS tertanam, 358 KB). Mode B (`dist-single/Code.gs`) menggabungkan semuanya. `doGet` memuat `Index`.
4. **Kolom turunan (F di PRD 01)** tetap ditulis server sebagai nilai (dihitung sekali di TypeScript yang diuji), bukan rumus sel. Kolom itu dikunci (proteksi peringatan). Penyimpangan dari PRD 03 bagian 3 poin 4 ini disengaja: dua implementasi (rumus Sheets dan kode) berisiko berbeda hasil, dan PRD 05 bagian 8 sendiri memilih agregasi di server. Bila ingin rumus hidup, tambahkan sebagai kolom bantu tanpa mengubah logika server.
5. Kolom tambahan di luar PRD 01 yang dibutuhkan PRD 05: `Stok_HP.Tgl_Rusak`, `Servis.ID_Klaim`, `Garansi_Retur.Dampak_Laba`, dan sheet `Laba_Bulanan` diperluas (biaya bonus, garansi, pembalikan retur, kerugian refund/rusak, terkunci).
6. Pembayaran awal selalu dicatat di `Pembayaran` (juga bila lunas) dengan catatan `Pembayaran awal <ID>` agar arus kas lengkap.
7. Laporan dihitung server untuk rentang tanggal apa pun (hari ini, 7 hari, bulan berjalan, bulan penuh). Pembatalan lintas bulan menjadi pembalik di bulan pembatalan; retur penuh dan tukar unit membalik laba di bulan retur.
8. Mode nyata tidak lagi memakai tanggal "transaksi terakhir" atau angka contoh pada dashboard dan Laporan.
**Perlu dikonfirmasi:** servis pelanggan dianggap dibayar saat Selesai (kas masuk = tarif); kolom tanggal/jam servis tidak punya jam selesai; foto di daftar stok belum menampilkan gambar kecil (hanya di galeri unit).

### D015 — Audit Data yang Tidak Masuk Sheet
**Temuan dan perbaikan** (urut dari yang paling berdampak):
1. **Sheet dari versi setup lama** tidak punya kolom baru (mis. `Tgl_Rusak`, `ID_Klaim`, `Dampak_Laba`); `Db.append` membuang isian kolom itu tanpa kabar. Sekarang `Db` menambahkan kolom yang hilang otomatis saat sheet pertama dipakai, menolak isian untuk kolom yang tidak dikenal (`KOLOM_TIDAK_DIKENAL`), dan `setupAwal()` menyelaraskan urutan kolom sheet lama tanpa menghapus data (kolom milik owner dipertahankan di kanan).
2. **Payload layar tidak terikat tipe server**, sehingga nama field yang meleset tidak ketahuan. Semua payload kini memakai `sesuai<TipeServer>(...)`: field yang salah ketik gagal dikompilasi.
3. **Supplier tidak masuk Kontak** dan `ID_Supplier` kosong → kini supplier dibuat/dicocokkan di Kontak (Tipe Supplier, atau Keduanya).
4. **`ID_Produk` tidak pernah terisi** → kini otomatis dari nama yang cocok dengan Katalog (juga unit tukar tambah).
5. **Barang Masuk tidak punya IMEI 2, catatan, cara bayar, dan tempo** → ditambahkan; hutang supplier kini tercatat dari aplikasi (wajib supplier dan jatuh tempo).
6. **Aksesoris tidak bisa dimasukkan dari aplikasi** (stok selalu kosong) → ada modal Aksesoris Masuk; stok minimum dari Pengaturan; harga beli rata-rata tertimbang.
7. **Bonus tidak mengurangi stok** dan modalnya angka tetap → bonus bisa diambil dari stok aksesoris (stok berkurang, modal = harga beli rata-rata).
8. **Tukar tambah tanpa checklist kondisi** dan penjualan tanpa catatan → ditambahkan dan tersimpan di `Tukar_Tambah` / `Penjualan.Catatan`.
9. **Pelanggan bernama tanpa WhatsApp tidak masuk Kontak** → kini dicatat (dipakai ulang hanya bila namanya tepat satu).
10. **Nama teknisi/vendor servis terbuang** → disimpan di `Servis.Nama_Vendor` dan tampil kembali.
11. **Pengaturan hanya menampilkan toast** (profil toko, garansi, ambang tidak disimpan, dan server memakai angka tetap) → kini tersimpan di sheet `Pengaturan` dan dipakai: garansi server, stok minimum, ambang peringatan, identitas nota.
12. **Backup, Cek Konsistensi, Log, dan Status Sistem di layar Pengaturan pura-pura** → kini memanggil server (backup terverifikasi, `cekKonsistensi`, `getLogTerbaru`, `getStatusSistem`, `getDaftarBackup`). Cek Konsistensi (PRD 05 bagian 7) juga berjalan harian lewat `jobCekTagihan`.
13. **Nota di layar memuat alamat dan WA karangan** → memakai Pengaturan.
**Belum ada UI:** unggah bukti pembayaran/pembelian/biaya (server sudah siap lewat `unggahFoto`), dan pemulihan dari backup lewat layar (sengaja hanya dari editor).


### D016 — Satu Perintah Build (`npm run build`), Aman di Windows/macOS
**Masalah:** `npm run build:gas` gagal di komputer pengguna sedangkan `build:single` berhasil, dan `clasp push` tetap "berhasil" (mendorong isi `dist/` lama).
**Penyebab:** skrip lama mengganti nama `index.html` (keluaran Vite) menjadi `Index.html` dengan menulis berkas baru lalu menghapus yang lama. Pada sistem berkas yang tidak membedakan huruf besar-kecil (Windows, macOS) kedua nama adalah berkas yang sama dan namanya tetap `index.html`, sehingga langkah hapus justru menghilangkan satu-satunya salinan dan langkah berikutnya gagal (ENOENT). Mode B tidak menyentuh berkas itu sehingga lolos. Di Linux galat ini tidak muncul, jadi tidak ketahuan.
**Perbaikan:**
1. `npm run build` (`scripts/build.mjs`) membangun Code.gs, SetupSheets.gs, Index.html, appsscript.json ke satu folder `dist/`. `build:gas` tetap ada sebagai nama lain.
2. Vite dibangun ke folder sementara di luar proyek (lewat API Vite, bukan `npx`), sehingga `index.html` dan `Index.html` tidak pernah berada di satu folder; `Index.html` ditulis langsung dengan huruf besar I (`tulisIndexHtml` menghapus kedua nama lebih dulu).
3. Mode produksi dipaksa (`NODE_ENV=production`) apa pun isi variabel lingkungan komputer: tanpa ini bundel bisa membengkak jadi 735 KB dengan kode pengembangan.
4. `dist/` dikosongkan setiap build; bila ada langkah gagal tampil nomor langkah, penyebab, dan versi Node, kode keluar 1, dan `dist/` dihapus agar `clasp push` tidak mendorong versi lama. `npm run push` = build lalu push.
5. Pemeriksaan akhir: isi `dist/` harus persis empat berkas dengan huruf besar-kecil yang benar.
6. Uji otomatis (`tests/unit/build-script.test.ts`) mereproduksi penyebab dengan sistem berkas tiruan yang tidak peka huruf, membangun sungguhan ke folder sementara dengan berkas usang, dan memeriksa jalur gagal.
