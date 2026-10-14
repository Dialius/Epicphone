# PRD 01 – Desain Database Spreadsheet dan Drive

Versi 1.0 | Mengacu ke PRD 00

## 1. Prinsip Desain Data

1. **Satu Spreadsheet utama** bernama `EPICPHONE_DB_UTAMA` (aturan nama lengkap di PRD 09). Isi diubah lewat web app; owner cukup membaca.
2. **Terbaca manusia:** tanggal `05 Okt 2026`, jam `14:32` (WIB), uang `Rp 3.250.000`, nama barang lengkap `Samsung Galaxy A54 5G 8/256 GB Hitam`. Tidak ada kode mentah tanpa nama.
3. **ID manusiawi:** pola `PREFIX-YYMM-NNNN`, contoh `JUAL-2610-0042`, `UNT-2610-0007`. Awalan: `PRD` produk, `KTK` kontak, `UNT` unit HP, `ACC` aksesoris, `BELI` pembelian, `JUAL` penjualan, `TT` tukar tambah, `SRV` servis, `KLM` klaim/retur, `TGH` tagihan, `BYR` pembayaran, `BIA` biaya, `BRK` berkas foto/bukti.
4. **Header bahasa Indonesia**, baris 1 dibekukan, filter aktif, baris selang-seling.
5. **Status berwarna** (conditional formatting): hijau = Ready/Lunas, kuning = Servis/Sebagian, merah = Telat/Rusak, abu = Terjual/Batal.
6. **Kolom rumus dan ID dikunci** (proteksi), sel input memakai dropdown atau validasi.
7. **Tanggal dan jam kolom terpisah**, format teks tanggal konsisten `dd MMM yyyy`, jam `HH:mm`.
8. **Tidak ada penghapusan**: baris dibatalkan lewat kolom `Status`.
9. Warna tab: biru = master, hijau = transaksi, oranye = laporan, abu = sistem.

## 2. Daftar Sheet

| Grup | Sheet | Fungsi |
|---|---|---|
| Master | Produk | Katalog model HP dan aksesoris |
| Master | Kontak | Supplier dan pelanggan |
| Stok | Stok_HP | Satu baris per unit (IMEI) |
| Stok | Stok_Aksesoris | Satu baris per SKU |
| Transaksi | Pembelian, Pembelian_Item | Barang masuk |
| Transaksi | Penjualan, Penjualan_Item | Barang keluar |
| Transaksi | Tukar_Tambah | HP lama dari pelanggan |
| Layanan | Servis | Servis internal dan pelanggan |
| Layanan | Garansi_Retur | Klaim, retur, refund |
| Keuangan | Hutang_Piutang, Pembayaran | Cicilan dan pelunasan |
| Keuangan | Biaya_Operasional | Listrik, sewa, dll |
| Laporan | Dashboard, Laba_Bulanan | Ringkasan otomatis |
| Sistem | Pengaturan, Referensi, Log_Aktivitas, Berkas_Foto | Konfigurasi, dropdown, audit, daftar foto dan bukti di Drive |

## 3. Skema Sheet

Keterangan tipe: **T** teks, **A** angka, **R** Rupiah, **Tgl** tanggal, **J** jam, **F** rumus (terkunci).

### 3.1 Produk
| Kolom | Tipe | Aturan / Contoh |
|---|---|---|
| ID_Produk | T | `PRD-0001` otomatis |
| Jenis | T | HP / Aksesoris |
| Platform | T | iPhone / Android (khusus jenis HP) |
| Merek | T | Samsung |
| Model | T | Galaxy A54 5G |
| Varian | T | 8/256 GB |
| Warna | T | Hitam |
| Nama_Lengkap | F | Gabungan merek, model, varian, warna |
| Harga_Jual_Standar | R | Opsional |
| Aktif | T | Ya / Tidak |

### 3.2 Kontak
| Kolom | Tipe | Aturan / Contoh |
|---|---|---|
| ID_Kontak | T | `KTK-0001` |
| Nama | T | Wajib |
| Tipe | T | Supplier / Pelanggan / Keduanya |
| No_WA | T | Format 628xxxx, hanya data kontak dan tampil di nota |
| Alamat | T | Opsional |
| Catatan | T | Opsional |
| Total_Transaksi | F | Jumlah transaksi terkait |

### 3.3 Stok_HP (inti sistem)
| Kolom | Tipe | Aturan / Contoh |
|---|---|---|
| ID_Unit | T | `UNT-2610-0007` |
| Tgl_Masuk / Jam_Masuk | Tgl / J | `05 Okt 2026` / `10:15` |
| IMEI_1 | T | 15 digit, unik |
| IMEI_2 | T | Opsional |
| ID_Produk | T | Dropdown dari Produk |
| Nama_Barang | F | Lookup nama lengkap |
| Kondisi | T | Baru / Bekas |
| Grade | T | A / B / C (khusus bekas) |
| Kelengkapan | T | Fullset / Unit saja / Tanpa dus |
| Baterai_Persen | A | Khusus bekas, contoh 87 |
| Bebas_Kunci_Akun | T | Ya / Tidak / Belum dicek (iCloud, akun Google, akun Mi, MDM); unit bekas wajib dicek sebelum Ready |
| Sumber | T | Pembelian / Tukar Tambah / Beli Putus |
| ID_Sumber | T | ID pembelian atau tukar tambah |
| Harga_Beli | R | Wajib |
| Biaya_Lain | R | Ongkir, cuci/poles, kardus pengganti, dll (opsional) |
| Biaya_Servis | F | Total biaya **aktual** servis internal berstatus Selesai untuk unit ini |
| HPP | F | Harga_Beli + Biaya_Lain + Biaya_Servis (modal unit) |
| Estimasi_Servis | F | Total estimasi servis yang belum selesai (informasi, belum masuk HPP) |
| Harga_Jual_Target | R | Saran jual |
| Status | T | Ready / Dipesan / Servis / Terjual / Retur / Rusak |
| Umur_Stok_Hari | F | Hari sejak masuk (peringatan jika lebih dari 30) |
| Tgl_Keluar | Tgl | Terisi saat terjual |
| ID_Penjualan | T | Terisi saat terjual |
| Link_Foto | T | Tautan folder foto unit di `02_FOTO-HP` (nama folder dan foto: PRD 09) |
| Catatan | T | Cacat, kelengkapan, dll |

**Unit rusak yang dibeli:** pada Barang Masuk, bila ditandai "Perlu servis", unit otomatis berstatus **Servis** dan dibuatkan tugas pada sheet Servis. Selama berstatus Servis unit tidak bisa dijual. Setelah servis Selesai, biayanya menambah `Biaya_Servis` sehingga HPP naik, lalu owner mengubah status menjadi Ready.

### 3.4 Stok_Aksesoris
| Kolom | Tipe | Aturan / Contoh |
|---|---|---|
| SKU | T | `ACC-0012` |
| Nama_Barang | T | Tempered Glass Samsung A54 |
| Kategori | T | Casing / Charger / Kabel / Pelindung layar / Lainnya |
| Stok | F | Masuk − keluar |
| Stok_Minimum | A | Peringatan jika stok lebih kecil atau sama |
| Harga_Beli_Rata2 | F | Rata-rata tertimbang pembelian |
| Harga_Jual | R | Harga standar |
| Status | F | Aman / Menipis / Habis |

### 3.5 Pembelian dan Pembelian_Item
**Pembelian:** ID_Pembelian (`BELI-2610-0003`), Tanggal, Jam, ID_Supplier, Nama_Supplier (F), Total (F), Metode_Bayar (Tunai / Transfer / Tempo), Dibayar, Sisa (F), Status_Bayar (F), Link_Nota, Status (Aktif / Batal), Catatan.

**Pembelian_Item:** ID_Item, ID_Pembelian, Tipe (HP / Aksesoris), ID_Unit atau SKU, Nama_Barang (F), Qty, Harga_Satuan, Subtotal (F).

### 3.6 Penjualan dan Penjualan_Item
**Penjualan:** ID_Penjualan (`JUAL-2610-0042`), Tanggal, Jam, ID_Pelanggan, Nama_Pelanggan (F), Subtotal (F), Diskon, Nilai_Tukar_Tambah, Total_Tagihan (F), Biaya_Bonus (F, hanya terlihat owner), Metode_Bayar (Tunai / Transfer / QRIS / Cicilan), Dibayar, Sisa_Tagihan (F), Status_Bayar (F: Lunas / Sebagian / Belum), Laba_Kotor (F, sudah dikurangi Biaya_Bonus), Link_Nota_PDF, Status (Aktif / Batal), Catatan.

**Penjualan_Item:** ID_Item, ID_Penjualan, Tipe (HP / Aksesoris / Bonus), ID_Unit atau SKU, Nama_Barang (F), IMEI (F), Qty, Harga_Jual, HPP (F, dibekukan saat jual), Laba_Item (F), Garansi_Hingga (F, tanggal).

### 3.6a Bonus Penjualan

Bonus (tempered glass, casing, charger, jasa pasang, dll) dicatat sebagai baris `Penjualan_Item` dengan **Tipe = Bonus** dan **Harga_Jual = 0**. Dua jenis:

| Jenis | Cara kerja |
|---|---|
| Bonus dari stok aksesoris | Pilih SKU dari Stok_Aksesoris; HPP bonus = Harga_Beli_Rata2 saat itu; stok berkurang |
| Bonus non-stok (jasa pasang, voucher, pulsa, dll) | Pilih nama dari daftar Referensi atau ketik bebas; HPP diisi manual (boleh 0); stok tidak berubah |

Aturan:
1. Laba_Item bonus = 0 − HPP (bernilai negatif) dan dijumlahkan menjadi `Biaya_Bonus` pada header Penjualan.
2. Satu penjualan boleh memiliki beberapa bonus; kolom `Alasan_Bonus` opsional (promo, negosiasi, hadiah pelanggan lama).
3. Pembatalan penjualan membatalkan bonus dan mengembalikan stok bonus.
4. Peringatan jika total Biaya_Bonus melebihi batas persen dari laba kotor item utama (default 50 persen, diubah di Pengaturan).
5. **Paket Bonus** (preset) disimpan di Pengaturan, misalnya "Paket Dasar: Tempered Glass + Casing", agar bonus bisa dipilih satu ketukan.
6. Nota menampilkan bonus pada bagian terpisah dengan tulisan GRATIS; modal bonus tidak tampil.

### 3.7 Tukar_Tambah
ID_TT, Tanggal, ID_Penjualan, ID_Pelanggan, ID_Unit_Masuk, Nama_Barang (F), IMEI, Kondisi_Singkat (checklist: layar, baterai, kamera, body, face/finger), Nilai_Taksir, Catatan.

### 3.8 Servis
| Kolom | Aturan / Contoh |
|---|---|
| ID_Servis | `SRV-2610-0005` |
| Tgl_Masuk, Jam_Masuk, Tgl_Selesai | Tanggal dan jam |
| Jenis | Internal (HP stok rusak, diperbaiki sebelum dijual) / Pelanggan |
| Pelaksana | Teknisi sendiri / Vendor luar |
| Nama_Vendor | Opsional, bila dikerjakan vendor luar |
| ID_Unit | Terisi jika internal |
| Nama_Pelanggan, Perangkat, IMEI | Terisi jika servis pelanggan |
| Keluhan, Tindakan | Teks |
| Estimasi_Biaya | R, perkiraan awal (belum masuk modal unit) |
| Biaya_Part, Biaya_Jasa_Teknisi | R, biaya sebenarnya; bila vendor luar, isi total tagihan vendor |
| Tarif_Pelanggan | R, hanya servis pelanggan |
| Laba_Servis | F, tarif − biaya |
| Status | Antri / Dikerjakan / Selesai / Diambil / Batal |

Servis internal berstatus **Selesai** menambah `Biaya_Servis` di Stok_HP, sehingga modal (HPP) unit naik otomatis. Contoh: beli Rp 2.900.000 + servis layar Rp 350.000 = modal Rp 3.250.000. Selama belum selesai, hanya estimasi yang tampil. Servis dibatalkan tidak menambah modal.

### 3.9 Garansi_Retur
ID_Klaim, Tanggal, Jam, ID_Penjualan, ID_Unit, Nama_Barang (F), Jenis (Klaim garansi / Retur / Refund / Tukar unit), Alasan, Masih_Garansi (F: Ya / Tidak), Tindakan, Nilai_Refund, Unit_Pengganti, Status (Dibuka / Diproses / Selesai / Ditolak).

### 3.10 Hutang_Piutang dan Pembayaran
**Hutang_Piutang:** ID, Jenis (Piutang pelanggan / Hutang supplier), ID_Referensi (penjualan atau pembelian), ID_Kontak, Nama (F), Total, Terbayar (F), Sisa (F), Jatuh_Tempo, Hari_Telat (F), Status (F: Belum / Sebagian / Lunas / Telat).

**Pembayaran:** ID_Bayar, Tanggal, Jam, ID_Hutang_Piutang, Nama (F), Jumlah, Metode, Catatan, Link_Bukti.

### 3.11 Biaya_Operasional
ID_Biaya, Tanggal, Kategori (Sewa / Listrik / Internet / Gaji / Transport / Iklan / Lainnya), Nominal, Catatan, Link_Bukti.

### 3.12 Laba_Bulanan (laporan)
Satu baris per bulan (`Okt 2026`): Jumlah unit terjual, Omzet, HPP, Laba kotor HP, Laba aksesoris, Laba servis, Kerugian retur/refund, Biaya operasional, **Laba bersih**, Margin persen, Selisih dari bulan lalu. Dihitung dari data transaksi lewat rumus agregasi.

### 3.13 Pengaturan, Referensi, Log_Aktivitas
- **Pengaturan:** nama toko (default: Epic Phone Purwokerto), tagline (Inovasi Ada Di Genggaman), akun Instagram (@epicphone_purwokerto), ID berkas logo, alamat, nomor WA, lama garansi default (baru / bekas / aksesoris), batas umur stok, stok minimum default, paket bonus, batas peringatan bonus, template nota, ID semua folder Drive (PRD 09).
- **Referensi:** daftar nilai dropdown (merek, kategori, metode bayar, status, kategori biaya).
- **Log_Aktivitas:** Tanggal, Jam, Aksi (Tambah / Ubah / Batal), Sheet, ID_Data, Ringkasan perubahan (nilai lama → baru).
- **Berkas_Foto:** ID_Berkas (`BRK-2610-0031`), Tanggal, Jam, Jenis_Referensi (Unit / Servis / Pembelian / Pembayaran / Biaya / Klaim), ID_Referensi, Posisi_atau_Tahap (DEPAN, SEBELUM, dll), Urutan, Nama_Berkas, ID_File_Drive, Link, Ukuran_KB, Status (Aktif / Terhapus).

## 4. Relasi Antar Sheet

```
Produk --< Stok_HP >-- Pembelian_Item >-- Pembelian >-- Kontak (Supplier)
              |
              +--< Penjualan_Item >-- Penjualan >-- Kontak (Pelanggan)
              |                          |-- Tukar_Tambah --> Stok_HP (unit baru)
              |                          +-- Hutang_Piutang --< Pembayaran
              +--< Servis
              +--< Garansi_Retur
Stok_Aksesoris --< Pembelian_Item / Penjualan_Item
```

## 5. Validasi Data

1. IMEI: 15 digit angka, unik di Stok_HP (kecuali unit sebelumnya Terjual/Retur).
2. Harga: angka bulat nol atau lebih; peringatan jika harga jual di bawah HPP.
3. Dibayar tidak boleh melebihi total tagihan.
4. Jatuh tempo wajib untuk transaksi tempo/cicilan dan tidak boleh sebelum tanggal transaksi.
5. Status unit hanya boleh berpindah mengikuti alur: Ready → Dipesan → Terjual; Terjual → Retur → Ready/Rusak; Ready ↔ Servis.
6. Nomor WA dinormalisasi ke format 62.

## 6. Struktur Google Drive dan Penamaan

Folder utama bernama **`EPICPHONE_00_SISTEM`** dan dibuat otomatis oleh Apps Script. Struktur folder lengkap serta format nama foto, Spreadsheet, backup, nota, dan laporan ditetapkan di **PRD 09**. Ringkasnya:

```
EPICPHONE_00_SISTEM/
  00_ASET-BRAND/  01_DATABASE/  02_FOTO-HP/  03_NOTA/  04_BUKTI-TRANSAKSI/
  05_SERVIS/  06_LAPORAN/  07_BACKUP/  08_ARSIP/  09_TEMPLATE-IMPOR/
```

Contoh nama yang dihasilkan sistem:

| Fungsi | Contoh |
|---|---|
| Spreadsheet utama | `EPICPHONE_DB_UTAMA` |
| Folder foto satu unit | `UNT-2610-0007_SAMSUNG-GALAXY-A54_IMEI-4521` |
| Foto unit | `EPICPHONE_FOTO-HP_UNT-2610-0007_DEPAN_01_2026-10-05_1032.jpg` |
| Backup harian | `EPICPHONE_BACKUP_HARIAN_2026-10-05_0100` |
| Nota | `EPICPHONE_NOTA_JUAL-2610-0042.pdf` |
| Laporan | `EPICPHONE_LAPORAN_LABA_2026-10.pdf` |

Aturan: folder dan nama dibuat oleh sistem (bukan diketik manual); tautan dan ID file tersimpan di kolom `Link_*` serta sheet `Berkas_Foto`; seluruh foto unit masuk ke satu folder khusus `02_FOTO-HP`, satu subfolder per unit.

## 7. Performa dan Kapasitas

1. Baca dan tulis data per blok (batch), bukan per sel.
2. Cache daftar produk dan referensi dengan CacheService.
3. Rumus berat (lookup, agregasi) dibatasi pada kolom yang perlu; laporan dihitung saat dibuka atau dijadwalkan harian.
4. Arsip tahunan: transaksi tahun lalu dipindah ke Spreadsheet `Arsip 2026` lewat menu Pengaturan.

## 8. Kriteria Penerimaan

1. Semua sheet dan kolom di atas terbentuk otomatis lewat satu fungsi setup.
2. Seluruh tanggal, jam, dan uang tampil dalam format yang terbaca tanpa perlu diubah manual.
3. Menambah unit dengan IMEI ganda ditolak dengan pesan jelas.
4. Laba bulanan cocok dengan perhitungan manual pada 10 transaksi uji.
5. Folder Drive dan tautan terbentuk otomatis pada transaksi pertama, dengan nama sesuai PRD 09.
6. Unit rusak yang ditandai "Perlu servis" berstatus Servis, tidak bisa dijual, dan HPP naik tepat sebesar biaya servis aktual setelah Selesai.
7. Penjualan dengan bonus mencatat Biaya_Bonus benar, mengurangi stok bonus, dan laba kotor berkurang sebesar modal bonus.
8. Foto unit tersimpan di folder unit yang benar, tercatat di Berkas_Foto, dan bernama sesuai standar.
