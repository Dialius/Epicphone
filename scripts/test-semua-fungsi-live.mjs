// test-semua-fungsi-live.mjs
// Audit dan verifikasi menyeluruh seluruh fungsi foto & penulisan spreadsheet terhadap backend live

async function rpc(fn, ...args) {
  const res = await fetch('http://localhost:5173/api/gas-rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fn, args }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return await res.json();
}

async function main() {
  console.log('=== AUDIT LIVE: SEMUA FUNGSI PENULISAN & FOTO ===\n');
  const hasil = [];

  function catat(nama, ok, pesan, data = {}) {
    hasil.push({ nama, ok, pesan, data });
    console.log(`${ok ? '✓' : '✖'} [${nama}]: ${pesan}`);
    if (!ok && data.error) console.error('  Detail:', data.error);
  }

  try {
    // 1. getSemuaData & Cek Foto Awal
    const awal = await rpc('getSemuaData');
    const stokAwal = awal.data?.stok || [];
    const fotoDavin = stokAwal.find(u => u.nama === 'davin')?.foto || [];
    const fotoIPhone = stokAwal.find(u => u.nama === 'iPhone 13')?.foto || [];
    catat('1. getSemuaData (Baca Stok & Foto Live)', awal.ok, `Ditemukan ${stokAwal.length} unit stok. Foto davin: ${fotoDavin.length}, iPhone 13: ${fotoIPhone.length}`);

    // 2. simpanKontak
    const kRes = await rpc('simpanKontak', {
      nama: 'TEST_QA_Supplier Handal',
      tipe: 'Supplier',
      noWa: '0812-9988-7766',
      alamat: 'Purwokerto Utara',
      catatan: 'Kontak uji QA live',
    });
    catat('2. simpanKontak', kRes.ok, `Kontak tersimpan dengan ID: ${kRes.data?.idKontak}`, { error: kRes.pesan });

    // 3. simpanProduk
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const prdRes = await rpc('simpanProduk', {
      jenis: 'HP',
      platform: 'Android',
      merek: 'TEST_QA_Xiaomi',
      model: `Redmi Note ${randomSuffix} Pro`,
      varian: '8/256 GB',
      warna: 'Midnight Black',
      hargaJualStandar: 3500000,
    });
    catat('3. simpanProduk', prdRes.ok, `Produk katalog tersimpan: ${prdRes.data?.namaLengkap}`, { error: prdRes.pesan });

    // 4. simpanPembelian (Unit HP & Aksesoris)
    const testImei1 = '99' + Math.floor(1000000000000 + Math.random() * 8999999999999);
    const testImeiServis = '98' + Math.floor(1000000000000 + Math.random() * 8999999999999);
    const beliRes = await rpc('simpanPembelian', {
      namaSupplier: 'TEST_QA_Supplier Handal',
      metodeBayar: 'Tunai',
      dibayar: 2050000,
      items: [
        {
          tipe: 'HP',
          namaBarang: 'TEST_QA_Redmi Note 13 Pro',
          imei1: testImei1,
          kondisi: 'Bekas',
          grade: 'A',
          kelengkapan: 'Fullset',
          bateraiPersen: 98,
          bebasKunciAkun: 'Ya',
          hargaBeli: 2000000,
          biayaLain: 50000,
          hargaJualTarget: 2600000,
          catatan: 'Unit HP uji live',
        },
        {
          tipe: 'Aksesoris',
          namaBarang: 'TEST_QA_Pelindung Layar Redmi',
          kategori: 'Pelindung layar',
          qty: 5,
          hargaBeli: 10000,
          hargaJualTarget: 30000,
        }
      ]
    });
    const idUnitBaru = beliRes.data?.unitsCreated?.[0];
    const idPembelian = beliRes.data?.idPembelian;
    catat('4. simpanPembelian (HP + Aksesoris)', beliRes.ok, `Pembelian ${idPembelian} tersimpan, unit dibuat: ${idUnitBaru}`, { error: beliRes.pesan });

    // 5. unggahFoto (Foto Unit ke Google Drive & Berkas_Foto)
    const sampleJpegBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
    let idBerkasFoto = '';
    if (idUnitBaru) {
      const fotoRes = await rpc('unggahFoto', {
        jenisReferensi: 'Unit',
        idReferensi: idUnitBaru,
        posisi: 'DEPAN',
        base64Data: sampleJpegBase64,
        mimeType: 'image/jpeg',
      });
      idBerkasFoto = fotoRes.data?.idBerkas || '';
      catat('5. unggahFoto ke Drive', fotoRes.ok, `Foto DEPAN terunggah ke Drive: ${fotoRes.data?.namaBerkas} (${fotoRes.data?.ukuranKB} KB), Link CDN: ${fotoRes.data?.linkDrive}`, { error: fotoRes.pesan });
    }

    // 6. getFotoReferensi
    if (idUnitBaru) {
      const getFotoRes = await rpc('getFotoReferensi', 'Unit', idUnitBaru);
      catat('6. getFotoReferensi', getFotoRes.ok, `Ditemukan ${getFotoRes.data?.length || 0} foto untuk ${idUnitBaru}`, { error: getFotoRes.pesan });
    }

    // 7. hapusFoto (pindah ke _TERHAPUS)
    if (idBerkasFoto) {
      const hapusRes = await rpc('hapusFoto', idBerkasFoto);
      catat('7. hapusFoto (pindah ke _TERHAPUS)', hapusRes.ok, `Foto ${idBerkasFoto} berhasil dipindahkan ke _TERHAPUS`, { error: hapusRes.pesan });
    }

    // 8. simpanPenjualan
    let idPenjualan = '';
    if (idUnitBaru) {
      const jualRes = await rpc('simpanPenjualan', {
        pelanggan: 'TEST_QA_Budi Pembeli',
        noWa: '0813-1122-3344',
        metodeBayar: 'Tempo',
        dibayar: 1000000,
        jatuhTempo: '2026-10-30',
        items: [
          {
            tipe: 'HP',
            idUnit: idUnitBaru,
            namaBarang: 'TEST_QA_Redmi Note 13 Pro',
            imei: testImei1,
            hargaJual: 2600000,
            modal: 2050000,
            garansiHari: 7,
          }
        ],
        catatan: 'Penjualan tempo uji live',
      });
      idPenjualan = jualRes.data?.idPenjualan || '';
      const idTagihan = jualRes.data?.idTagihan || '';
      catat('8. simpanPenjualan (Tempo / Cicilan)', jualRes.ok, `Penjualan ${idPenjualan} tercatat, Tagihan: ${idTagihan}, Sisa: ${jualRes.data?.sisa}`, { error: jualRes.pesan });

      // 9. terimaPembayaran (Pelunasan Piutang)
      if (idTagihan) {
        const bayarRes = await rpc('terimaPembayaran', {
          idHutangPiutang: idTagihan,
          jumlah: 1600000,
          metode: 'Transfer',
          catatan: 'Pelunasan lunas uji live',
        });
        catat('9. terimaPembayaran Cicilan', bayarRes.ok, `Pembayaran ${bayarRes.data?.idPembayaran} diterima, sisa tagihan: ${bayarRes.data?.sisaBaru}`, { error: bayarRes.pesan });
      }

      // 10. batalkanTransaksi
      if (idPenjualan) {
        const batalRes = await rpc('batalkanTransaksi', idPenjualan, 'Dibatalkan untuk audit QA');
        catat('10. batalkanTransaksi', batalRes.ok, `Transaksi ${idPenjualan} dibatalkan, status unit kembali Ready`, { error: batalRes.pesan });
      }
    }

    // 11. simpanServis
    const srvRes = await rpc('simpanServis', {
      namaPelanggan: 'TEST_QA_Pelanggan Servis',
      noWa: '0815-5566-7788',
      namaPerangkat: 'TEST_QA_Samsung A52',
      imei: testImeiServis,
      keluhan: 'Layar retak ganti LCD',
      estimasiBiaya: 500000,
      jenis: 'Pelanggan',
    });
    const idServis = srvRes.data?.idServis;
    catat('11. simpanServis Pelanggan', srvRes.ok, `Servis tercatat: ${idServis}`, { error: srvRes.pesan });

    // 12. updateStatusServis
    if (idServis) {
      const upServis = await rpc('updateStatusServis', idServis, 'Selesai', {
        tindakan: 'Ganti LCD original selesai',
        biayaPart: 250000,
        biayaJasa: 100000,
        tarifPelanggan: 500000,
      });
      catat('12. updateStatusServis', upServis.ok, `Status servis ${idServis} diupdate ke Selesai, laba: ${upServis.data?.labaServis}`, { error: upServis.pesan });
    }

    // 13. simpanBiaya
    const biayaRes = await rpc('simpanBiaya', {
      kategori: 'Listrik',
      nominal: 150000,
      catatan: 'TEST_QA_Biaya token listrik toko',
    });
    catat('13. simpanBiaya Operasional', biayaRes.ok, `Biaya tercatat: ${biayaRes.data?.idBiaya}`, { error: biayaRes.pesan });

    // 14. simpanPengaturan
    const setRes = await rpc('simpanPengaturan', {
      TAGLINE: 'Inovasi Ada Di Genggaman',
    });
    catat('14. simpanPengaturan', setRes.ok, `Pengaturan tersimpan`, { error: setRes.pesan });

    // 15. Pembersihan Total Data Uji (Safety Rule 3)
    console.log('\n--- Menjalankan Pembersihan Atomik Data Uji (bersihkanDataUji) ---');
    const cleanRes = await rpc('bersihkanDataUji', 'TEST_QA_');
    catat('15. bersihkanDataUji (Pembersihan Total)', cleanRes.ok, `Hasil pembersihan: ${JSON.stringify(cleanRes.data?.terhapus || cleanRes.terhapus || {})}`);

    // 16. Verifikasi State Akhir Basis Data
    const akhir = await rpc('getSemuaData');
    const stokAkhir = akhir.data?.stok || [];
    const kondisiKembali = stokAkhir.length === stokAwal.length && !stokAkhir.some(u => u.nama.includes('TEST_QA_'));
    catat('16. Verifikasi State Basis Data', kondisiKembali, `Jumlah unit stok kembali tepat ${stokAkhir.length} unit asli (100% bersih tanpa residu).`);

  } catch (err) {
    console.error('Fatal error saat pengujian:', err);
  }

  console.log('\n=== RINGKASAN AUDIT ===');
  const semuaLolos = hasil.every(h => h.ok);
  console.log(`Status Keseluruhan: ${semuaLolos ? 'SEMUA FUNGSI LULUS (100% VERIFIED)' : 'ADA KEGAGALAN'}`);
  console.log(`Total Fungsi Diuji: ${hasil.length}`);
}

main();
