# PRD 06 – Keamanan, Backup, dan Pemulihan

Versi 1.0 | Mengacu ke PRD 01 (struktur Drive) dan PRD 03 (trigger)

## 1. Tujuan

Data jual-beli tidak boleh bocor, rusak, atau hilang. Target pemulihan: **kehilangan data maksimal 24 jam (RPO) dan sistem pulih dalam 1 jam (RTO)**.

## 2. Model Akses

| Lapisan | Ketentuan |
|---|---|
| Web app | Deploy dengan Execute as `Me` dan Access `Only myself`; hanya akun Google owner yang bisa membuka |
| Spreadsheet | Hanya owner sebagai pemilik; tidak dibagikan. Sheet data diproteksi (hanya kode dan owner yang bisa mengubah) |
| Drive | Folder `EPICPHONE_00_SISTEM` tidak dibagikan; hanya nota yang dapat berstatus "siapa pun dengan tautan" (opsi, bisa dimatikan) |
| Akun | Wajib verifikasi 2 langkah (2-Step Verification) di akun Google owner |
| Perangkat | Kunci layar di HP owner; keluar dari akun Google di perangkat yang tidak dipakai |

### Izin (OAuth scope) yang Diminta
Hanya yang diperlukan: Spreadsheet, Drive, dan pengaturan trigger. Tidak meminta izin email, kontak, atau kalender. Dicantumkan di `appsscript.json` dan diperiksa saat rilis.

## 3. Perlindungan Data Aplikasi

1. Validasi di server untuk semua input (jangan percaya data dari browser).
2. Sanitasi teks: karakter awal `=`, `+`, `-`, `@` diawali apostrof agar tidak dibaca sebagai rumus.
3. Kolom rumus dan ID dikunci; perubahan lewat kode saja.
4. Transaksi tidak dihapus, hanya dibatalkan, sehingga jejak audit utuh.
5. `Log_Aktivitas` mencatat waktu, aksi, ID data, serta nilai lama dan baru; log tidak bisa diubah dari antarmuka.
6. Konfigurasi sensitif disimpan di PropertiesService, bukan di dalam kode.
7. Kunci anti-ganda (`idemKey`) mencegah transaksi ganda.

## 4. Data Pribadi

IMEI, nomor WhatsApp, nama, dan alamat pelanggan diperlakukan sebagai data pribadi (rujukan: UU Pelindungan Data Pribadi, UU No. 27 Tahun 2022).

1. Kumpulkan hanya yang dibutuhkan; nama dan nomor WA pelanggan boleh dikosongkan ("Umum").
2. Nota hanya memuat data pelanggan yang perlu.
3. Tautan nota publik dapat dimatikan di Pengaturan; jika dimatikan, owner mengunduh PDF lalu mengirim manual.
4. Fitur **Hapus Data Pelanggan** (anonimkan nama, nomor, alamat tanpa menghapus transaksi) tersedia bila pelanggan meminta.
5. Tidak ada data yang dikirim ke layanan pihak ketiga.
6. Foto unit tidak boleh memuat identitas pelanggan (KTP, wajah); folder `02_FOTO-HP` tidak dibagikan dan nama berkas tidak memuat data pribadi.

## 5. Strategi Backup

| Lapisan | Frekuensi | Tujuan | Retensi |
|---|---|---|---|
| Riwayat versi Spreadsheet (bawaan Google) | Otomatis | Spreadsheet utama | Sesuai kebijakan Google |
| Backup harian | Setiap hari 01:00 WIB | `07_BACKUP/HARIAN`, nama `EPICPHONE_BACKUP_HARIAN_2026-10-05_0100` | 30 hari |
| Backup bulanan | Tanggal 1, 02:00 WIB | `07_BACKUP/BULANAN`, nama `EPICPHONE_BACKUP_BULANAN_2026-10` | 12 bulan |
| Salinan luar | Mingguan, ekspor `.xlsx` ke akun Google kedua milik owner (atau unduhan manual) | Di luar akun utama, nama `EPICPHONE_BACKUP_MINGGUAN_2026-W40.xlsx` | 8 minggu |
| Konfigurasi kode | Setiap rilis | Repositori Git (privat) | Selamanya |

Ketentuan:
1. Backup memakai penyalinan berkas Drive (`makeCopy`) sehingga murah kuota.
2. Setiap backup diverifikasi (jumlah sheet dan baris data utama tidak nol); hasil dicatat di log.
3. Kegagalan backup menampilkan peringatan merah di Beranda.
4. Nama dan lokasi semua backup (harian, bulanan, mingguan, pra-rilis, pra-migrasi, pengaman pemulihan) mengikuti PRD 09 bagian 4.2.
5. Trigger dijadwalkan terpisah minimal 10 menit agar tidak bertabrakan. Perhatikan batas akun gratis: 6 menit per eksekusi, 90 menit total runtime trigger per hari, 20 trigger per proyek (verifikasi angka terbaru di dokumentasi kuota resmi Google sebelum rilis).

## 6. Skenario Gangguan dan Prosedur Pemulihan

| Skenario | Dampak | Pemulihan |
|---|---|---|
| Baris/sel terubah salah | Data keliru | Buka riwayat versi Spreadsheet atau Log_Aktivitas, kembalikan nilai lama |
| Spreadsheet terhapus | Semua data hilang | Buka tempat sampah Drive (30 hari); jika tidak ada, salin backup harian terbaru, jalankan `pulihkanDariBackup()` |
| Deploy rusak setelah rilis | Aplikasi error | Pilih deployment versi sebelumnya (rollback, PRD 07) |
| Akun Google tidak bisa diakses | Semua tidak bisa dibuka | Pulihkan akun lewat Google Account Recovery; data cadangan ada di akun kedua |
| Kuota harian habis | Fitur terhenti sementara | Tunggu reset 24 jam; kurangi trigger; operasi harian tetap berjalan karena tidak memakai trigger |
| Spreadsheet mendekati batas 10 juta sel | Lambat/gagal simpan | Jalankan arsip tahunan (PRD 01 bagian 7) |
| Foto terhapus dari aplikasi | Foto hilang dari galeri | Ambil di `02_FOTO-HP/_TERHAPUS` (nama tetap), pulihkan ke folder unit dan perbarui status di Berkas_Foto |
| Pengguna salah batalkan transaksi | Stok/laba berubah | Gunakan Log_Aktivitas; buat ulang transaksi dari data log |

`pulihkanDariBackup()` menampilkan daftar backup, meminta konfirmasi, membuat salinan pengaman kondisi sekarang sebelum menimpa, lalu memuat ulang aplikasi.

## 7. Perubahan Skema (Migrasi)

1. Nomor versi skema disimpan di Pengaturan (`versi_skema`).
2. Setiap rilis yang mengubah kolom membawa fungsi migrasi bertahap dan idempoten.
3. Sebelum migrasi, backup otomatis dibuat dan diberi label "pra-migrasi".

## 8. Ancaman dan Mitigasi

| Ancaman | Mitigasi |
|---|---|
| HP owner hilang/dicuri | Kunci layar, keluarkan sesi lewat pengaturan akun Google, 2 langkah verifikasi |
| Tautan nota dibagikan ke pihak lain | Tautan hanya memuat nota itu; matikan tautan publik jika perlu |
| Injeksi rumus lewat nama pelanggan | Sanitasi bagian 3 |
| Skrip diubah pihak lain | Proyek tidak dibagikan; akses editor hanya owner |
| Kehilangan kode sumber | Repositori Git privat + salinan di Drive |

## 9. Kriteria Penerimaan

1. Pengguna selain akun owner tidak dapat membuka web app (diuji dengan akun lain).
2. Backup harian berjalan 14 hari berturut-turut dan lolos verifikasi.
3. Simulasi Spreadsheet terhapus dipulihkan kurang dari 1 jam sesuai prosedur.
4. Input `=HYPERLINK(...)` pada nama pelanggan tersimpan sebagai teks biasa.
5. Mematikan tautan publik membuat nota tidak lagi dapat diakses lewat tautan.
6. Seluruh backup dan foto memakai nama dan folder sesuai PRD 09.
