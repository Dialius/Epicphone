# PRD 03 – Backend Google Apps Script

Versi 1.0 | Mengacu ke PRD 00, 01, 02

## 1. Arsitektur

```
Browser (HP/laptop)
   | google.script.run
   v
Web App Apps Script  (doGet -> HtmlService)
   |-- Router/Service  (aturan bisnis + validasi)
   |-- Repository      (baca/tulis Spreadsheet, cache)
   |-- Nota & Laporan  (PDF ke Drive)
   v
Spreadsheet "EPICPHONE_DB_UTAMA"  +  Google Drive (EPICPHONE_00_SISTEM/...)
```

**Deploy web app:** Execute as `Me` (owner), Who has access `Only myself`. Semua logika bisnis dan validasi dijalankan di server; validasi di browser hanya untuk kenyamanan.

## 2. Struktur Proyek

| File | Tanggung jawab |
|---|---|
| `Code.gs` | `doGet`, router, wrapper `try/catch` untuk semua fungsi publik |
| `Config.gs` | Nama sheet, nama kolom, konstanta, zona waktu `Asia/Jakarta` |
| `Setup.gs` | `setupAwal()`: buat sheet, header, format, validasi, proteksi, folder Drive, trigger |
| `Db.gs` | Repository generik: `getAll`, `findById`, `append`, `updateById`, `batchUpdate` |
| `Id.gs` | Pembuat ID `PREFIX-YYMM-NNNN` (LockService + PropertiesService) |
| `StokService.gs` | Unit HP, aksesoris, status, umur stok |
| `PembelianService.gs` | Barang masuk |
| `PenjualanService.gs` | Penjualan, tukar tambah, pembatalan |
| `ServisService.gs` | Servis internal dan pelanggan |
| `GaransiService.gs` | Klaim, retur, refund |
| `TagihanService.gs` | Hutang-piutang, pembayaran, status telat |
| `Nota.gs` | Pembuatan PDF nota |
| `Laporan.gs` | Agregasi laba, PDF laporan bulanan |
| `Backup.gs` | Salin harian/bulanan, pembersihan backup lama |
| `Log.gs` | Tulis `Log_Aktivitas` |
| `Penamaan.gs` | Pembuat nama folder/berkas sesuai PRD 09: `slug`, `namaFoto`, `namaFolderUnit`, `namaBackup`, `namaNota`, `namaLaporan` |
| `FotoService.gs` | Unggah, daftar, dan arsip foto/bukti di Drive |
| `Utils.gs` | Format tanggal/uang, normalisasi, validasi IMEI |
| `index.html` | Antarmuka satu berkas hasil build Vite (PRD 04), mengikuti PRD 02 |

## 3. Aturan Akses Data

1. Kolom dipetakan **berdasarkan nama header**, bukan nomor kolom, supaya aman jika kolom bergeser.
2. Baca seluruh sheet sekali per permintaan, lalu proses di memori; tulis dengan `setValues` per blok.
3. Daftar produk, kontak, dan referensi di-cache (`CacheService`, 10 menit) dan dibersihkan setiap ada perubahan master.
4. Kolom rumus tidak pernah ditulis dari kode.
5. Semua penulisan dibungkus `LockService.getScriptLock()` (tunggu maksimal 20 detik).

## 4. Fungsi Publik (Antarmuka ke Layar)

| Fungsi | Input utama | Aturan / Output |
|---|---|---|
| `getBeranda()` | - | Ringkasan hari ini, peringatan (tagihan jatuh tempo, stok lama, stok menipis, servis siap), transaksi terakhir |
| `cariStok(q, filter)` | teks, filter | Cocokkan model/IMEI/4 digit akhir; maksimal 50 hasil per halaman |
| `getUnit(id)` | ID_Unit | Detail + riwayat gabungan |
| `simpanPembelian(data)` | supplier, item[], bayar | Validasi IMEI unik, buat unit status Ready, buat Hutang jika tempo, simpan bukti ke Drive |
| `simpanPenjualan(data)` | pelanggan, item[], tukarTambah, diskon, bayar | Lihat bagian 5; output ID + info nota |
| `batalkanTransaksi(id, alasan)` | ID, alasan | Status Batal, stok kembali, tagihan dibatalkan, nota diberi watermark |
| `simpanServis(data)` / `updateStatusServis(id, status)` | data servis | Servis internal berstatus Selesai menambah Biaya_Servis unit (modal naik); estimasi tidak masuk modal |
| `kirimKeServis(idUnit, data)` | unit, keluhan, estimasi, pelaksana | Ubah status unit menjadi Servis dan buat tugas servis internal |
| `getPaketBonus()` | - | Daftar paket bonus preset dari Pengaturan |
| `unggahFoto(data)` | jenis & ID referensi, posisi/tahap, mime, base64, idemKey | Lihat bagian 12 |
| `hapusFoto(idBerkas)` | ID berkas | Pindah ke `_TERHAPUS`, status Terhapus |
| `simpanKlaim(data)` | ID_Penjualan/IMEI, jenis, tindakan | Hitung status garansi, atur status unit dan dampak laba |
| `terimaPembayaran(idTagihan, jumlah, metode)` | ID, nominal | Tolak jika melebihi sisa; update status Lunas/Sebagian |
| `getLaporanBulanan(bulan)` | YYYY-MM | Angka laba (rumus di PRD 04) |
| `buatNota(idPenjualan)` | ID | PDF, lihat bagian 6 |
| `getPengaturan()` / `simpanPengaturan(data)` | - | Dengan validasi |

Semua fungsi mengembalikan bentuk seragam:
`{ ok: true, data: ... }` atau `{ ok: false, kode: "IMEI_GANDA", pesan: "IMEI ini sudah ada di stok (UNT-2610-0007)." }`. Pesan selalu bahasa manusia sesuai PRD 02.

## 5. Penyimpanan Penjualan (Satu Transaksi Utuh)

Urutan di dalam satu lock:
1. Validasi ulang di server: unit berstatus Ready/Dipesan (unit berstatus Servis ditolak), stok aksesoris dan stok bonus cukup, harga item bonus selalu 0, dibayar tidak melebihi total, jatuh tempo ada jika sisa lebih dari 0.
2. Beku HPP tiap item dari data saat ini. Untuk item Bonus: HPP = Harga_Beli_Rata2 (bonus stok) atau HPP input (bonus non-stok), sehingga Laba_Item bonus bernilai negatif dan dijumlahkan ke `Biaya_Bonus`.
3. Tulis Penjualan dengan status `Draft`.
4. Tulis Penjualan_Item, Tukar_Tambah (dan buat unit baru di Stok_HP), Hutang_Piutang jika ada sisa, dan Pembayaran awal.
5. Ubah status unit menjadi Terjual, kurangi stok aksesoris.
6. Ubah status Penjualan menjadi `Aktif`, tulis Log_Aktivitas.
7. Jika langkah 4-5 gagal: kembalikan perubahan yang sudah tertulis dan tandai Penjualan `Gagal` (dibersihkan oleh pekerjaan harian). Pengguna menerima pesan "Gagal menyimpan, tidak ada data yang berubah".

## 6. Pembuatan Nota PDF

**Tujuan:** hanya membuat dan menyimpan nota. **Pengiriman dilakukan manual oleh owner.**

Alur `buatNota(idPenjualan)`:
1. Ambil data Penjualan, item, pelanggan, tukar tambah, pengaturan toko.
2. Render template HTML (`NotaTemplate.html`) sesuai spesifikasi isi nota PRD 02 bagian 6, ukuran A5 (opsi 80 mm di Pengaturan).
3. Konversi ke PDF (`getAs('application/pdf')`), nama file `EPICPHONE_NOTA_JUAL-2610-0042.pdf` (PRD 09).
4. Simpan ke `EPICPHONE_00_SISTEM/03_NOTA/2026/10/`; atur akses "siapa pun yang punya tautan dapat melihat" (bisa dimatikan di Pengaturan).
5. Simpan tautan ke kolom `Link_Nota_PDF`.
6. Kembalikan `{ idFile, urlLihat, urlUnduh, base64 }` agar tombol Unduh PDF dan pratinjau langsung bekerja.

Aturan tambahan:
- Dibuat otomatis tepat setelah penjualan tersimpan; gagal membuat nota **tidak** membatalkan penjualan (tampil tombol "Buat Ulang Nota").
- Pembatalan atau perubahan pembayaran membuat versi baru (watermark DIBATALKAN, atau status Lunas/Sebagian diperbarui); versi lama dipindah ke `03_NOTA/RIWAYAT` dengan nama `..._v1_DIBATALKAN` (PRD 09).
- Nomor nota tetap sama sepanjang transaksi.
- Nota tidak memuat modal dan laba.

## 7. Pekerjaan Terjadwal (Trigger)

| Pekerjaan | Jadwal | Tugas |
|---|---|---|
| `jobBackupHarian` | Setiap hari 01:00 WIB | Salin Spreadsheet ke `07_BACKUP/HARIAN` bernama `EPICPHONE_BACKUP_HARIAN_2026-10-05_0100`, hapus yang lebih dari 30 hari |
| `jobBackupBulanan` | Tanggal 1, 02:00 | Salin ke `07_BACKUP/BULANAN` bernama `EPICPHONE_BACKUP_BULANAN_2026-10`, simpan 12 terakhir |
| `jobCekTagihan` | Setiap hari 06:00 | Tandai status Telat, hitung Hari_Telat |
| `jobLaporanBulanan` | Tanggal 1, 03:00 | Buat PDF `EPICPHONE_LAPORAN_LABA_2026-10.pdf` di `06_LAPORAN` |
| `jobBersihkan` | Mingguan | Hapus draft gagal dan cache lama |

Kegagalan job dicatat di Log_Aktivitas dan memunculkan peringatan di Beranda.

## 8. Keamanan dan Integritas

1. Akses web app hanya akun owner; Spreadsheet dan folder Drive tidak dibagikan ke pihak lain.
2. Sheet data diproteksi; hanya kode dan owner yang bisa menulis.
3. Sanitasi semua input teks (hapus karakter awal `=`, `+`, `-`, `@` agar tidak dieksekusi sebagai rumus).
4. Setiap perubahan dicatat: waktu, aksi, ID data, nilai lama dan baru.
5. Tidak ada kunci rahasia di kode; konfigurasi di PropertiesService.

## 9. Batas Platform dan Mitigasi

| Batas | Mitigasi |
|---|---|
| Eksekusi 6 menit | Operasi batch, job dipecah per bagian |
| Kuota harian (konversi PDF, baca/tulis, email) | Pantau penggunaan; nota dibuat sesuai permintaan, bukan massal |
| Spreadsheet 10 juta sel | Arsip tahunan (PRD 01 bagian 7) |
| Cold start web app 1-3 detik | Layar skeleton, cache data master |

## 10. Kriteria Penerimaan

1. `setupAwal()` membuat seluruh sheet, folder, dan trigger dalam satu kali jalan.
2. Penjualan dengan tukar tambah dan sisa tagihan menghasilkan data konsisten di 6 sheet terkait.
3. Dua penyimpanan bersamaan tidak menghasilkan ID ganda.
4. Nota PDF jadi di bawah 5 detik, muncul di Drive, dan bisa diunduh dari layar sukses.
5. Pembatalan mengembalikan stok dan membuat nota berwatermark DIBATALKAN.
6. Backup harian berjalan 7 hari berturut-turut tanpa gagal.

## 11. Pengemasan dan Penyajian UI

1. Kode backend ditulis dalam TypeScript, dibundel menjadi satu `Code.js` (PRD 04); fungsi publik dibungkus sebagai fungsi global agar bisa dipanggil `google.script.run`.
2. `doGet` menyajikan UI dengan viewport wajib:
```javascript
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Epic Phone')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}
```
Pada mode satu berkas (PRD 04 mode B), `createHtmlOutput(teksHtml)` dipakai dengan HTML tertanam.
3. **Kunci anti-ganda:** setiap fungsi tulis menerima `idemKey`; server menyimpan kunci di cache 10 menit dan mengembalikan hasil sebelumnya bila kunci yang sama datang lagi.
4. Aset UI seluruhnya tertanam; backend tidak melayani berkas statis lain.
5. Kuota akun gratis yang relevan: 6 menit per eksekusi, 90 menit total runtime trigger per hari, 20 trigger per proyek (verifikasi angka terbaru di dokumentasi resmi sebelum rilis).

## 12. Foto dan Penamaan Berkas

### Fungsi penamaan (`Penamaan.gs`)
Semua nama dibuat oleh fungsi ini sesuai PRD 09; tidak ada kode lain yang menyusun nama sendiri.

| Fungsi | Hasil contoh |
|---|---|
| `slug(teks, maks)` | `Samsung Galaxy A54 5G` menjadi `SAMSUNG-GALAXY-A54-5G` |
| `namaFolderUnit(unit)` | `UNT-2610-0007_SAMSUNG-GALAXY-A54_IMEI-4521` |
| `namaFoto({jenis, idRef, posisi, urutan, waktu})` | `EPICPHONE_FOTO-HP_UNT-2610-0007_DEPAN_01_2026-10-05_1032.jpg` |
| `namaBackup(jenis, waktu)` | `EPICPHONE_BACKUP_HARIAN_2026-10-05_0100` |
| `namaNota(idJual, versi, status)` | `EPICPHONE_NOTA_JUAL-2610-0042.pdf` |
| `namaLaporan(jenis, bulan)` | `EPICPHONE_LAPORAN_LABA_2026-10.pdf` |

Aturan: hanya `A-Z 0-9 - _`, tidak memuat nama pelanggan, nomor WA, atau IMEI lengkap, maksimal 100 karakter.

### `unggahFoto(data)`
1. Validasi: mime `image/jpeg`, `image/png`, atau `image/webp`; ukuran setelah dekode di bawah 1,5 MB; posisi/tahap termasuk daftar kode resmi; jumlah foto aktif unit belum 12.
2. Cari folder unit di `02_FOTO-HP`; bila belum ada, buat dengan `namaFolderUnit` dan isi `Link_Foto`.
3. Hitung urutan berikutnya untuk kombinasi unit + posisi (01, 02, ...); jangan pernah menimpa berkas.
4. Simpan berkas dengan nama dari `namaFoto`, lalu catat baris di `Berkas_Foto` (ID_File_Drive, tautan, ukuran, status Aktif).
5. Kembalikan `{ idBerkas, nama, urlLihat, pratinjau }`; `pratinjau` berupa gambar kecil (data URI) agar tidak bergantung pada cookie pihak ketiga di iframe.
6. Foto servis, bukti pembelian, bukti bayar, dan bukti biaya memakai fungsi yang sama dengan folder dan format nama masing-masing (PRD 09 bagian 4.3).

### Perawatan folder
- Jika model unit diubah, folder unit diganti namanya otomatis.
- `hapusFoto` memindahkan berkas ke `_TERHAPUS`; pembersihan permanen hanya manual oleh owner.
- ID semua folder disimpan di Pengaturan dan di-cache; bila folder dihapus tidak sengaja, `perbaikiFolder()` membuatnya kembali dengan nama baku.
