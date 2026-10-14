# PRD 09 – Standar Penamaan Folder, Foto, dan Berkas (EPICPHONE)

Versi 1.0 | Berlaku untuk PRD 01, 03, 05, 06, 07

## 1. Tujuan

Semua folder, foto, Spreadsheet, backup, nota, dan laporan di Google Drive memiliki **nama yang langsung menjelaskan fungsinya**, mudah dicari, terurut otomatis, dan seragam. Nama dibuat oleh sistem (bukan diketik manual) sehingga tidak ada yang salah ketik atau tidak konsisten.

## 2. Prinsip Penamaan

1. Semua nama berawalan **`EPICPHONE`** (kecuali folder per unit, lihat bagian 5).
2. Format umum: `EPICPHONE_JENIS_ID_DETAIL_URUTAN_TANGGAL_WAKTU.ekstensi`
3. Pemisah antar bagian memakai **garis bawah `_`**; pemisah di dalam satu bagian memakai **tanda hubung `-`**.
4. Huruf kapital untuk kode, tanpa spasi, tanpa aksen, hanya karakter `A-Z 0-9 - _`.
5. Tanggal format ISO `2026-10-05`, waktu `1032` (jam-menit WIB), sehingga urutan nama = urutan waktu.
6. **ID transaksi selalu muncul di nama** (misalnya `JUAL-2610-0042`) agar berkas mudah dikaitkan ke data.
7. **Tidak ada data pribadi** di nama berkas: tidak memuat nama pelanggan, nomor WA, atau IMEI lengkap (hanya 4 digit akhir).
8. Panjang nama maksimal 100 karakter; bagian detail dipotong bila melebihi.
9. Nama tidak diketik pengguna; dibuat oleh fungsi penamaan di sistem (PRD 03 bagian 12).

## 3. Struktur Folder

```
EPICPHONE_00_SISTEM/                       Folder utama (semua file sistem)
  00_ASET-BRAND/                           Logo, ikon, template nota
  01_DATABASE/                             EPICPHONE_DB_UTAMA (Spreadsheet utama)
  02_FOTO-HP/                              Seluruh foto unit HP
    UNT-2610-0007_SAMSUNG-GALAXY-A54_IMEI-4521/    satu folder per unit
    _TERHAPUS/                             foto yang dibuang dari aplikasi (tidak dihapus permanen)
  03_NOTA/
    2026/10/                               nota penjualan per tahun/bulan
    RIWAYAT/                               versi nota lama / dibatalkan
  04_BUKTI-TRANSAKSI/
    PEMBELIAN/  PEMBAYARAN/  BIAYA/        nota supplier, bukti transfer, bukti biaya
  05_SERVIS/                               foto perangkat servis
  06_LAPORAN/                              PDF laporan dan ekspor CSV
  07_BACKUP/
    HARIAN/  BULANAN/  MINGGUAN/  PRA-RILIS/  PRA-MIGRASI/  PENGAMAN-PULIH/
  08_ARSIP/                                arsip tahunan
  09_TEMPLATE-IMPOR/                       template impor data awal
```

Nomor di depan folder menjaga urutan tampilan tetap sama di Drive. Folder dibuat otomatis oleh `setupAwal()`; ID semua folder disimpan di sheet Pengaturan.

## 4. Format Nama Berkas

### 4.1 Spreadsheet

| Fungsi | Format | Contoh |
|---|---|---|
| Database utama (produksi) | `EPICPHONE_DB_UTAMA` | `EPICPHONE_DB_UTAMA` |
| Database uji | `EPICPHONE_DB_UTAMA_DEV` | `EPICPHONE_DB_UTAMA_DEV` |
| Arsip tahunan | `EPICPHONE_ARSIP_TRANSAKSI_TAHUN` | `EPICPHONE_ARSIP_TRANSAKSI_2026` |
| Template impor data awal | `EPICPHONE_TEMPLATE_IMPOR_JENIS_vN` | `EPICPHONE_TEMPLATE_IMPOR_DATA-AWAL_v1` |
| Proyek Apps Script | `EPICPHONE_SISTEM` | `EPICPHONE_SISTEM` |

### 4.2 Backup

| Jenis | Format | Contoh | Retensi |
|---|---|---|---|
| Harian | `EPICPHONE_BACKUP_HARIAN_TANGGAL_WAKTU` | `EPICPHONE_BACKUP_HARIAN_2026-10-05_0100` | 30 hari |
| Bulanan | `EPICPHONE_BACKUP_BULANAN_TAHUN-BULAN` | `EPICPHONE_BACKUP_BULANAN_2026-10` | 12 bulan |
| Mingguan (salinan luar, .xlsx) | `EPICPHONE_BACKUP_MINGGUAN_TAHUN-Wnn` | `EPICPHONE_BACKUP_MINGGUAN_2026-W40.xlsx` | 8 minggu |
| Sebelum rilis | `EPICPHONE_BACKUP_PRA-RILIS_vX-Y-Z_TANGGAL_WAKTU` | `EPICPHONE_BACKUP_PRA-RILIS_v1-2-0_2026-10-05_1430` | 3 terakhir |
| Sebelum migrasi skema | `EPICPHONE_BACKUP_PRA-MIGRASI_skema-N_TANGGAL_WAKTU` | `EPICPHONE_BACKUP_PRA-MIGRASI_skema-3_2026-10-05_1500` | 3 terakhir |
| Pengaman sebelum pemulihan | `EPICPHONE_BACKUP_PENGAMAN-PULIH_TANGGAL_WAKTU` | `EPICPHONE_BACKUP_PENGAMAN-PULIH_2026-10-05_1600` | 30 hari |

### 4.3 Foto dan Bukti

| Fungsi | Format | Contoh |
|---|---|---|
| **Foto unit HP** | `EPICPHONE_FOTO-HP_IDUNIT_POSISI_URUTAN_TANGGAL_WAKTU.jpg` | `EPICPHONE_FOTO-HP_UNT-2610-0007_DEPAN_01_2026-10-05_1032.jpg` |
| Foto servis | `EPICPHONE_FOTO-SERVIS_IDSERVIS_TAHAP_URUTAN_TANGGAL_WAKTU.jpg` | `EPICPHONE_FOTO-SERVIS_SRV-2610-0005_SEBELUM_01_2026-10-05_1100.jpg` |
| Bukti pembelian (nota supplier) | `EPICPHONE_BUKTI-BELI_IDBELI_JENIS_URUTAN_TANGGAL_WAKTU.jpg` | `EPICPHONE_BUKTI-BELI_BELI-2610-0003_NOTA-SUPPLIER_01_2026-10-05_0950.jpg` |
| Bukti pembayaran/cicilan | `EPICPHONE_BUKTI-BAYAR_IDBAYAR_METODE_URUTAN_TANGGAL_WAKTU.jpg` | `EPICPHONE_BUKTI-BAYAR_BYR-2610-0012_TRANSFER_01_2026-10-07_1215.jpg` |
| Bukti biaya operasional | `EPICPHONE_BUKTI-BIAYA_IDBIAYA_KATEGORI_URUTAN_TANGGAL_WAKTU.jpg` | `EPICPHONE_BUKTI-BIAYA_BIA-2610-0004_LISTRIK_01_2026-10-03_0900.jpg` |
| Foto kondisi retur/klaim | `EPICPHONE_FOTO-KLAIM_IDKLAIM_URUTAN_TANGGAL_WAKTU.jpg` | `EPICPHONE_FOTO-KLAIM_KLM-2610-0001_01_2026-10-09_1400.jpg` |

**Kode POSISI foto unit:** `DEPAN`, `BELAKANG`, `SAMPING`, `LAYAR-MENYALA`, `IMEI`, `BATERAI`, `DUS`, `KELENGKAPAN`, `CACAT`, `LAINNYA`.
**Kode TAHAP foto servis:** `SEBELUM`, `PROSES`, `SESUDAH`.
**Urutan** (`01`, `02`, ...) berjalan per kombinasi unit + posisi.

### 4.4 Nota dan Laporan

| Fungsi | Format | Contoh |
|---|---|---|
| Nota penjualan | `EPICPHONE_NOTA_IDJUAL.pdf` | `EPICPHONE_NOTA_JUAL-2610-0042.pdf` |
| Nota versi lama / dibatalkan (di RIWAYAT) | `EPICPHONE_NOTA_IDJUAL_vN_STATUS.pdf` | `EPICPHONE_NOTA_JUAL-2610-0042_v1_DIBATALKAN.pdf` |
| Laporan laba bulanan | `EPICPHONE_LAPORAN_LABA_TAHUN-BULAN.pdf` | `EPICPHONE_LAPORAN_LABA_2026-10.pdf` |
| Laporan arus kas | `EPICPHONE_LAPORAN_ARUS-KAS_TAHUN-BULAN.pdf` | `EPICPHONE_LAPORAN_ARUS-KAS_2026-10.pdf` |
| Ekspor CSV | `EPICPHONE_EKSPOR_JENIS_DARI_sd_SAMPAI.csv` | `EPICPHONE_EKSPOR_PENJUALAN_2026-10-01_sd_2026-10-31.csv` |
| Logo dan aset | `EPICPHONE_ASET_NAMA.ekstensi` | `EPICPHONE_ASET_LOGO-UTAMA.png` |

## 5. Folder per Unit HP

Format: `IDUNIT_MEREK-MODEL_IMEI-4DIGIT` (tanpa awalan EPICPHONE agar ID unit terlihat paling depan dan mudah dicari).

Contoh: `UNT-2610-0007_SAMSUNG-GALAXY-A54_IMEI-4521`

1. Dibuat otomatis saat unit pertama kali disimpan; tautannya masuk kolom `Link_Foto` di Stok_HP.
2. Jika model unit diubah, nama folder diperbarui otomatis; ID unit di depan tidak pernah berubah.
3. Semua foto unit (termasuk foto servis internal unit itu bila diinginkan) ada di dalam folder ini.

## 6. Aturan Pembersihan Nama (Slug)

| Masukan | Hasil |
|---|---|
| `Samsung Galaxy A54 5G` | `SAMSUNG-GALAXY-A54-5G` |
| `iPhone 13 Pro Max` | `IPHONE-13-PRO-MAX` |
| `Xiaomi Redmi Note 12 (8/256)` | `XIAOMI-REDMI-NOTE-12-8-256` |
| `Nota Supplier` | `NOTA-SUPPLIER` |

Langkah: huruf besar, buang aksen, spasi dan karakter khusus menjadi `-`, gabungkan `-` ganda, buang `-` di ujung, potong sesuai batas panjang.

## 7. Aturan Foto

1. Format JPEG; foto dikompres di peramban sebelum diunggah (sisi terpanjang maksimal 1600 px, kualitas sekitar 80 persen, target di bawah 400 KB per foto).
2. Unit bekas: minimal 3 foto (`DEPAN`, `BELAKANG`, `LAYAR-MENYALA`); unit baru: minimal 1 foto (`DUS` atau `DEPAN`). Maksimal 12 foto per unit.
3. Setiap foto dicatat di sheet `Berkas_Foto` (ID, jenis dan ID referensi, posisi, urutan, nama berkas, ID file Drive, tautan, ukuran, tanggal, jam). Acuan utama adalah ID file Drive, bukan nama.
4. Foto yang dibuang dari aplikasi dipindah ke `_TERHAPUS` dengan nama tetap; pembersihan permanen hanya manual oleh owner.
5. Nama dibuat otomatis; pengguna cukup memilih posisi foto.

## 8. Kriteria Penerimaan

1. `setupAwal()` membuat seluruh folder pada bagian 3 dengan nama tepat sesuai standar.
2. Foto yang diunggah dari aplikasi masuk ke folder unit yang benar dan bernama sesuai bagian 4.3 tanpa input nama manual.
3. Backup harian, bulanan, mingguan, pra-rilis, dan pengaman pemulihan bernama sesuai bagian 4.2 dan masuk ke subfolder yang tepat.
4. Nota, laporan, dan ekspor bernama sesuai bagian 4.4.
5. Tidak ada nama berkas yang memuat nama pelanggan, nomor WA, atau IMEI lengkap.
6. Mengunggah dua foto di posisi yang sama menghasilkan urutan `01` dan `02` tanpa menimpa.
