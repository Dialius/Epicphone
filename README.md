# EPICPHONE Sistem

Sistem pencatatan jual-beli HP untuk Epic Phone Purwokerto.
Berbasis Google Apps Script + Google Spreadsheet + Google Drive.

## Prasyarat

- Node.js 18+ (disarankan 20 atau 22)
- `clasp login` sudah dijalankan
- Google Apps Script API aktif di [script.google.com/home/usersettings](https://script.google.com/home/usersettings)

## Cara menjalankan

```bash
npm install

# Mode dev (data contoh, tanpa Apps Script)
npm run dev

# Buka http://localhost:5173
```

## Build dan deploy

Satu perintah membangun semuanya ke satu folder, `dist/`:

```bash
npm run build      # Code.gs + SetupSheets.gs + Index.html + appsscript.json di dist/
npm run push       # npm run build lalu clasp push (berhenti bila build gagal)
npm run deploy     # npm run push lalu clasp deploy otomatis (auto-deskripsi timestamp & update versi)
```

Setelah mengubah kode apa pun (backend, frontend, atau setup sheet) cukup jalankan `npm run deploy` untuk langsung memperbarui Web App live tanpa membuka browser.
Folder `dist/` dikosongkan setiap build, jadi tidak ada berkas usang yang ikut terdorong; bila build gagal, `dist/` dihapus
dan pesan galat menyebut langkah serta penyebabnya.

Perintah lain: `npm run build:gas` (nama lama, sama dengan `build`), `npm run build:single` (Mode B: satu berkas
`dist-single/Code.gs`, tidak menyentuh `dist/`), `npm run verifikasi` (typecheck + tes + build).

Di browser: script.google.com -> Deploy -> Web app (Execute as: Me | Access: Only myself).

## Berkas di proyek Apps Script

| Berkas | Isi |
|---|---|
| `Code.gs` | Seluruh logika aplikasi (transaksi, laporan, nota, foto, backup) |
| `SetupSheets.gs` | `setupAwal()` membuat Spreadsheet, folder Drive, dan trigger; `cekStrukturSheet()`, `migrasiSkema()`, `perbaikiFolder()` |
| `Index.html` | Antarmuka satu berkas |

Desain sheet lengkap (kolom, lebar, format): [`docs/SKEMA-SHEET.md`](docs/SKEMA-SHEET.md).

## Setup pertama kali

1. Buat proyek Apps Script baru di [script.google.com](https://script.google.com) (standalone), salin Script ID dari **Pengaturan proyek**.
2. Salin `.clasp.json.contoh` menjadi `.clasp.json` (lewati bila sudah punya) dan isi `scriptId`-nya, lalu `npm ci && npm run push`. Berkas `.clasp.json` milikmu tidak ikut dalam zip supaya tidak tertimpa.
3. Di editor pilih fungsi `setupAwal` (berkas `SetupSheets.gs`), klik **Run**, setujui izin Drive/Spreadsheet/Trigger. Ini membuat `EPICPHONE_DB_UTAMA` di `01_DATABASE`, seluruh folder PRD 09, isi Referensi/Pengaturan, dan enam trigger. Aman dijalankan ulang (tidak menimpa data atau pengaturan).
4. Buka sheet **Pengaturan** dan isi `ALAMAT`, `NO_WA`, `ID_BERKAS_LOGO` (ID file logo di `00_ASET-BRAND`), dan bila perlu `EMAIL_AKUN_CADANGAN` untuk backup mingguan.
5. **Deploy > New deployment > Web app** (Execute as: Me, Who has access: Only myself), buka alamat `/exec`.
6. Setiap kali kode diubah: `npm run push`, lalu **Deploy > Manage deployments > Edit > New version**. Tanpa versi baru, alamat `/exec` tetap menjalankan kode lama.
7. Sebelum rilis berikutnya jalankan `backupPraRilis`. Pemulihan: `daftarBackup`, isi Properti Skrip `PULIH_ID_BACKUP` dan `PULIH_KONFIRMASI=YA`, lalu `pulihkanDariBackup`.

Tanpa clasp: salin isi `dist/Code.gs`, `dist/SetupSheets.gs`, `dist/Index.html`, dan `dist/appsscript.json` ke editor dengan nama berkas yang sama. Untuk satu berkas saja pakai `npm run build:single` dan salin `dist-single/Code.gs`.

Catatan: dengan akses "Only myself", hanya akun pemilik yang bisa membuka aplikasi (sesuai PRD 00: owner satu-satunya pengguna).

## Unit test

```bash
npm test
```

## Struktur penting

```
src/frontend/    — UI (Vite + Preact + TypeScript)
src/backend/     — Backend (TypeScript -> Code.gs dan SetupSheets.gs via esbuild)
tests/unit/      — Unit test (Vitest)
dist/            — Hasil build (di-push ke Apps Script)
docs/            — Dokumentasi dan DECISIONS.md
prd/             — Dokumen PRD (sumber kebenaran)
```

## Catatan

- Simbol § tidak digunakan di mana pun (lihat aturan kerja PRD)
- Semua penulisan ke Spreadsheet dilakukan via backend; frontend tidak pernah menulis langsung
- Transaksi tidak dihapus, hanya dibatalkan (kolom Status = Batal)

## Desain v2 (Okt 2026)
Redesain UI/UX: lihat `CHANGELOG-REDESIGN.md` (apa yang berubah, hasil verifikasi, dan yang belum dikerjakan) dan `docs/RENCANA-REDESIGN-UI-UX.md` (rencana lengkap). Perintah tambahan:

```
npm run typecheck   # tsc --noEmit
npm run cek:css     # pagar pengaman CSS (kelas/variabel yatim, font minimum, ukuran dist)
npm run purge:css   # lapor aturan CSS yang kelasnya tak dipakai (tambah --tulis untuk membuangnya)
```
Galeri komponen (mode dev): `http://localhost:5173/#/_galeri`
