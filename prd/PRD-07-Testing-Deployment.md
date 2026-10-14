# PRD 07 – Testing, Migrasi Data, dan Deployment

Versi 1.0 | Mengacu ke PRD 00 sampai 06

## 1. Strategi Uji

| Lapisan | Alat | Cakupan |
|---|---|---|
| Unit | Vitest | Format uang/tanggal, validasi IMEI, hitung total/sisa/laba, pembuat ID |
| Integrasi backend | Spreadsheet uji + fungsi uji di Apps Script | Penjualan, pembelian, tukar tambah, servis, retur, tagihan, nota PDF |
| Tampilan dan responsif | Playwright (mode mock) | Semua layar pada viewport 320, 360, 390, 412, 768, 1024, 1280, 1536 px |
| Uji penerimaan (UAT) | Owner memakai HP sungguhan | Skenario harian nyata |
| Uji keamanan | Manual | Akses akun lain, injeksi rumus, tautan nota |

## 2. Lingkungan

| Lingkungan | Spreadsheet | Deployment | Tujuan |
|---|---|---|---|
| Dev | `EPICPHONE_DB_UTAMA_DEV` berisi data contoh | Head deployment (`/dev`) | Pengembangan dan uji |
| Prod | `EPICPHONE_DB_UTAMA` | Deployment bernomor versi (`/exec`) | Dipakai owner |

Kode sama, perbedaan hanya ID Spreadsheet di PropertiesService.

## 3. Skenario Uji Fungsional (Ringkas)

| No | Skenario | Hasil yang diharapkan |
|---|---|---|
| T01 | Barang masuk 1 HP bekas dengan IMEI valid | Unit Ready, ID terbentuk, HPP = harga beli |
| T02 | Barang masuk dengan IMEI ganda | Ditolak, pesan menunjuk unit lama |
| T03 | IMEI kurang dari 15 digit | Pesan validasi di kolom |
| T04 | Jual 1 HP tunai lunas | Unit Terjual, laba benar, nota PDF jadi |
| T05 | Jual HP + aksesoris dengan diskon | Diskon terbagi proporsional, stok aksesoris berkurang |
| T06 | Jual harga di bawah modal | Peringatan kuning, bisa lanjut setelah konfirmasi |
| T07 | Jual dengan tukar tambah | HP lama jadi unit stok, tagihan berkurang |
| T08 | Jual dengan cicilan | Piutang terbentuk, jatuh tempo wajib |
| T09 | Terima cicilan sebagian lalu lunas | Status Sebagian lalu Lunas, nota diperbarui |
| T10 | Bayar melebihi sisa | Ditolak |
| T11 | Jual aksesoris stok 0 | Ditolak |
| T12 | Batalkan penjualan | Stok kembali, tagihan hilang, nota DIBATALKAN |
| T13 | Servis internal | HPP unit naik sebesar biaya servis |
| T14 | Servis pelanggan selesai | Laba servis masuk laporan bulan selesai |
| T15 | Klaim garansi dalam masa berlaku | Status "masih garansi", tindakan tercatat |
| T16 | Retur penuh | Laba dibalik di bulan retur, unit kembali stok |
| T17 | Tagihan lewat jatuh tempo | Status Telat setelah job harian |
| T18 | Dua simpan bersamaan | Tidak ada ID ganda |
| T19 | Tombol Simpan ditekan dua kali | Satu transaksi saja |
| T20 | Koneksi putus saat mengisi form | Draf pulih saat dibuka lagi |
| T21 | Laporan bulanan vs hitung manual | Selisih nol |
| T22 | Backup harian dan pemulihan | Data kembali utuh |
| T23 | Akun lain membuka URL | Akses ditolak |
| T24 | Nama pelanggan berisi `=1+1` | Tersimpan sebagai teks |
| T25 | Jual HP dengan 2 bonus dari stok aksesoris | Stok bonus berkurang, harga bonus 0, Biaya_Bonus = jumlah modal bonus, laba kotor berkurang sebesar itu, nota menampilkan bonus GRATIS tanpa modal |
| T26 | Bonus non-stok (jasa pasang, modal Rp 5.000) | Biaya_Bonus Rp 5.000, stok tidak berubah |
| T27 | Batalkan penjualan yang memiliki bonus | Stok bonus kembali, Biaya_Bonus hilang |
| T28 | Barang masuk HP rusak dengan toggle "Perlu servis" | Status Servis, tugas servis terbentuk, modal belum termasuk estimasi, unit tidak bisa dijual |
| T29 | Selesaikan servis internal Rp 350.000 | HPP naik Rp 350.000, unit bisa dijadikan Ready, laba penjualan memakai HPP baru |
| T30 | Unggah 3 foto unit (2 di posisi sama) | Masuk folder unit yang benar, nama sesuai PRD 09, urutan 01 dan 02, tercatat di Berkas_Foto |
| T31 | Backup harian dan bulanan berjalan | Nama dan folder sesuai PRD 09 |
| T32 | Hapus foto dari aplikasi | Berkas pindah ke `_TERHAPUS`, status Terhapus, tidak hilang permanen |

## 4. Matriks Perangkat dan Peramban

| Kelompok | Contoh | Peramban |
|---|---|---|
| HP kecil | Lebar 320-360 px | Chrome Android, Samsung Internet |
| HP standar | 375-412 px | Chrome Android, Safari iOS |
| HP lipat / layar sempit | Layar luar perangkat lipat | Chrome |
| Tablet | 768-834 px (potret dan lanskap) | Chrome, Safari |
| Laptop | 1366 x 768, 1440 x 900 | Chrome, Edge, Firefox, Safari |
| Desktop | 1920 x 1080 ke atas | Chrome, Edge, Firefox |

Cek tiap layar: tanpa gulir horizontal, tombol terjangkau, teks terbaca, nota dan laporan tercetak benar (A5 dan A4).

## 5. Migrasi Data Awal

1. Siapkan **template impor** (`EPICPHONE_TEMPLATE_IMPOR_DATA-AWAL_v1`, Spreadsheet) untuk stok HP, aksesoris, kontak, dan piutang/hutang berjalan.
2. Owner mengisi dari catatan lama; kolom wajib ditandai.
3. Fungsi `imporData(dryRun=true)` memeriksa semua baris (IMEI ganda, harga kosong, format tanggal) dan mengeluarkan laporan galat tanpa menyimpan.
4. Setelah galat nol, jalankan `imporData(false)`; hasil dicek acak 20 baris terhadap catatan asli.
5. Hitung nilai stok sistem dan cocokkan dengan hitungan fisik (stock opname) sebelum go-live.

## 6. Langkah Rilis (Deployment)

1. `npm run test` dan `npm run build:gas`, semua lulus.
2. Backup Spreadsheet prod dengan nama `EPICPHONE_BACKUP_PRA-RILIS_vX-Y-Z_TANGGAL_WAKTU` (PRD 09).
3. `clasp push` ke proyek prod.
4. Di editor Apps Script: **Deploy > Manage deployments > Edit > New version**, beri deskripsi, catat nomor versi.
5. Jalankan `setupAwal()` sekali (hanya rilis pertama) dan setujui izin akses.
6. Buka URL `/exec` dari HP dan laptop; jalankan daftar periksa asap (T04, T08, nota, laporan).
7. Simpan URL ke layar utama HP owner.

## 7. Daftar Periksa Go-Live

- [ ] Semua uji T01-T32 lulus di Dev
- [ ] Data awal terimpor dan cocok dengan stok fisik
- [ ] Pengaturan toko lengkap (nama, alamat, kontak, garansi, template nota)
- [ ] Nota contoh dicetak A5 dan dibuka di HP (logo EPICPHONE, bonus, dan garansi tampil benar)
- [ ] Trigger terpasang dan satu backup berhasil
- [ ] Verifikasi 2 langkah aktif
- [ ] Owner lulus uji kegunaan (PRD 02 bagian 10)
- [ ] URL tersimpan di layar utama HP dan laptop

## 8. Rollback

1. Aplikasi bermasalah setelah rilis: **Manage deployments > Edit > pilih versi sebelumnya**; URL tetap sama.
2. Data bermasalah: pulihkan dari backup pra-rilis (PRD 06 bagian 6).
3. Keputusan rollback diambil bila ada galat yang menghambat penjualan lebih dari 15 menit.

## 9. Masa Pendampingan (Hypercare)

Dua minggu pertama: tinjau Log_Aktivitas harian, kumpulkan masukan owner, perbaiki galat prioritas tinggi dalam 1 hari kerja, dan cocokkan stok fisik di akhir minggu pertama.

## 10. Kriteria Penerimaan Rilis

1. 100 persen uji wajib (T01-T32) lulus.
2. Tidak ada galat tingkat tinggi terbuka.
3. UAT owner selesai tanpa hambatan besar.
4. Selisih stok sistem vs fisik di bawah 1 persen.
5. Rollback berhasil diuji satu kali sebelum go-live.
