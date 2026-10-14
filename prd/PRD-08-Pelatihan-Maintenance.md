# PRD 08 – Pelatihan, SOP, dan Maintenance

Versi 1.0 | Mengacu ke PRD 00 sampai 07

## 1. Tujuan

Owner mandiri memakai sistem sehari-hari, tahu apa yang dilakukan saat ada masalah, dan sistem tetap sehat dalam jangka panjang tanpa biaya langganan.

## 2. Rencana Pelatihan

| Sesi | Durasi | Materi | Praktik |
|---|---|---|---|
| 1. Pengenalan | 30 menit | Tujuan sistem, tur layar, navigasi, istilah (Modal, Margin, Umur stok) | Menjelajah Beranda dan Stok |
| 2. Barang masuk dan stok | 45 menit | Input HP baru/bekas, IMEI, foto unit, aksesoris, HP rusak yang perlu servis | Memasukkan 5 unit contoh |
| 3. Penjualan dan nota | 45 menit | Wizard jual, bonus, tukar tambah, cicilan, unduh nota, kirim manual | 3 penjualan berbeda |
| 4. Tagihan, servis, garansi | 30 menit | Terima pembayaran, servis, klaim, retur | Satu kasus tiap jenis |
| 5. Laporan dan rutinitas | 30 menit | Laba bulanan, kunci bulan, backup, Cek Konsistensi | Membaca laporan contoh |

Bahan: panduan singkat bergambar (PDF 1 sampai 2 halaman per modul), video layar 2-3 menit per tugas, dan kartu ringkas "Cara cepat" yang bisa dicetak.

## 3. Panduan Pengguna (Daftar Isi)

1. Memulai dan menambahkan aplikasi ke layar utama
2. Barang masuk, foto unit, dan HP rusak yang perlu servis
3. Menjual, memberi bonus, dan membuat nota (mengirim nota secara manual)
4. Tukar tambah
5. Servis
6. Garansi dan retur
7. Tagihan dan cicilan
8. Membaca laporan
9. Pengaturan toko
10. Pertanyaan umum dan pemecahan masalah

## 4. SOP Rutin

### Harian
| Waktu | Tugas |
|---|---|
| Buka toko | Lihat Beranda: tagihan jatuh tempo, servis siap diambil, peringatan backup |
| Sepanjang hari | Catat transaksi saat terjadi (jangan ditunda sampai malam); foto setiap unit saat barang masuk |
| Tutup toko | Cocokkan kas masuk hari ini dengan uang di laci dan rekening (Arus Kas) |

### Mingguan
1. Tinjau unit dengan umur stok lebih dari 30 hari; putuskan turun harga atau promo.
2. Lihat aksesoris menipis; catat kebutuhan belanja.
3. Pastikan salinan luar mingguan berhasil.

### Bulanan
1. Tanggal 1: periksa laporan bulan lalu yang dibuat otomatis.
2. Jalankan **Cek Konsistensi**; selesaikan selisih jika ada.
3. Lakukan **stock opname** singkat (hitung fisik vs sistem, minimal HP bernilai tinggi).
4. Tekan **Kunci Bulan**.
5. Catat dan input biaya operasional yang belum tercatat.

### Tahunan
Arsip transaksi tahun lalu, tinjau kebutuhan fitur baru, perbarui kata sandi dan pengaturan akun Google.

## 5. Pemecahan Masalah

| Gejala | Kemungkinan penyebab | Tindakan |
|---|---|---|
| Halaman tidak memuat / "Perlu otorisasi" | Izin belum disetujui atau login akun salah | Buka dengan akun Google owner, setujui izin |
| "Gagal menyimpan" | Koneksi lemah atau kunci data sedang dipakai | Tunggu 10 detik, coba lagi; data form tidak hilang |
| Foto gagal diunggah | Koneksi lemah atau ruang Drive penuh | Ketuk Coba Lagi (foto tetap di antrean); cek sisa ruang Google Drive |
| Nota tidak muncul | Pembuatan PDF gagal | Tekan **Buat Ulang Nota** di Riwayat Transaksi |
| Angka laporan tampak keliru | Transaksi bulan terkunci diubah | Jalankan Cek Konsistensi, lihat Log_Aktivitas |
| Peringatan backup merah | Trigger gagal / kuota habis | Jalankan **Backup Sekarang** di Pengaturan; cek kuota |
| Aplikasi lambat | Data besar atau koneksi lambat | Muat ulang; jalankan arsip tahunan jika perlu |
| Tampilan berantakan di HP | Peramban lama atau zoom terlalu besar | Perbarui peramban, atur zoom 100 persen |

## 6. Maintenance Teknis

| Kegiatan | Frekuensi | Penanggung jawab |
|---|---|---|
| Cek log galat dan kuota Apps Script | Mingguan (otomatis tampil di Pengaturan) | Owner |
| Verifikasi backup berhasil | Harian (peringatan otomatis) | Sistem |
| Uji pemulihan dari backup | 6 bulan sekali | Pengembang + owner |
| Pembaruan kode dan perbaikan galat | Sesuai kebutuhan, rilis bernomor versi | Pengembang |
| Tinjau perubahan kebijakan/kuota Google | 6 bulan sekali | Pengembang |
| Arsip tahunan | Tiap Januari | Owner (tombol di Pengaturan) |

**Biaya berjalan:** tidak ada biaya lisensi (Apps Script, Spreadsheet, Drive gratis dalam batas kuota akun). Pantau ruang Drive; tingkatkan penyimpanan Google hanya jika foto/nota memenuhi kuota.

## 7. Manajemen Perubahan

1. Permintaan fitur dicatat di daftar backlog (Spreadsheet sederhana: tanggal, permintaan, prioritas, status).
2. Perubahan melalui siklus Dev > uji > rilis bernomor versi (PRD 07).
3. Setiap rilis disertai catatan perubahan singkat yang tampil di Pengaturan > Tentang.

## 8. Ide Pengembangan Berikutnya (v2, Belum Termasuk Ruang Lingkup)

1. Peran karyawan dengan hak akses terbatas dan sembunyikan modal/laba.
2. Pemindai IMEI/barcode lewat kamera.
3. Stock opname terpandu di aplikasi.
4. Integrasi pengiriman nota otomatis (WhatsApp) bila nanti dibutuhkan.
5. Multi-cabang.
6. Pengingat jatuh tempo otomatis ke owner (email).

## 9. Serah Terima (Handover)

Paket yang diserahkan ke owner:
- [ ] URL web app produksi dan akses akun Google owner sebagai pemilik Spreadsheet, folder Drive, dan proyek Apps Script
- [ ] Repositori kode sumber (privat) beserta petunjuk build `npm run build:gas`
- [ ] Panduan pengguna dan kartu "Cara cepat"
- [ ] Dokumen PRD 00 sampai 09 (termasuk standar penamaan Drive)
- [ ] Prosedur pemulihan (PRD 06) dan catatan lokasi backup
- [ ] Catatan versi rilis dan daftar backlog awal

## 10. Kriteria Penerimaan

1. Owner menyelesaikan seluruh tugas uji kegunaan tanpa bantuan setelah pelatihan.
2. Seluruh paket serah terima bagian 9 lengkap.
3. Owner berhasil menjalankan SOP bulanan satu kali penuh (termasuk Kunci Bulan dan Cek Konsistensi).
4. Simulasi masalah (nota gagal, backup merah) dapat diselesaikan owner memakai tabel pemecahan masalah.
