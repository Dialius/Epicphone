// ServisService.ts — M5 Servis: internal (HP stok rusak, biaya masuk modal) dan servis pelanggan.
// PRD 01 bagian 3.8, PRD 00 aturan 12, PRD 02 bagian 5.6.

import { SHEET, PREFIX_ID, STATUS_UNIT } from './Config';
import { Db } from './Db';
import { GalatBisnis } from './Galat';
import { denganLock } from './Lock';
import { buatId } from './Id';
import { log } from './Log';
import { sanitasi, angka, tglIso, jamHm, sekarang, normalisasiWA } from './Utils';
import { ubahStatusUnit, hitungUlangModalUnit, UnitRow } from './StokService';
import { cariAtauBuatKontak } from './MasterService';

export interface ServisInput {
  jenis: 'Internal' | 'Pelanggan';
  /** Internal: ID unit atau IMEI-nya */
  idUnit?: string;
  imei?: string;
  namaPerangkat?: string;
  namaPelanggan?: string;
  noWa?: string;
  keluhan: string;
  pelaksana?: 'Teknisi sendiri' | 'Vendor luar';
  namaVendor?: string;
  estimasiBiaya?: number;
  tarifPelanggan?: number;
  /** Servis atas klaim garansi (tarif 0, biayanya jadi Biaya garansi) */
  idKlaim?: string;
}

export interface HasilServis {
  idServis: string;
  idUnit?: string;
  statusUnit?: string;
}

export interface SelesaiServisInput {
  biayaPart?: number;
  biayaJasa?: number;
  tindakan?: string;
  tarifPelanggan?: number;
  /** Internal: tanya "Jadikan Ready dan siap dijual?" */
  jadikanReady?: boolean;
  /** Internal, servis dibatalkan: nasib unit */
  unitJadi?: 'Servis' | 'Rusak' | 'Ready';
}

export interface HasilStatusServis {
  idServis: string;
  status: string;
  labaServis?: number;
  hppLama?: number;
  hppBaru?: number;
  statusUnit?: string;
}

const URUTAN: Record<string, string[]> = {
  Antri: ['Dikerjakan', 'Selesai', 'Batal'],
  Dikerjakan: ['Selesai', 'Batal'],
  Selesai: ['Diambil'],
  Diambil: [],
  Batal: [],
};

function cariUnit(ref: string | undefined, imei: string | undefined): UnitRow | null {
  const rows = Db.getAll(SHEET.STOK_HP) as unknown as UnitRow[];
  const id = String(ref ?? '').trim();
  const im = String(imei ?? '').trim();
  const aktif = (u: UnitRow) => u.Status !== STATUS_UNIT.BATAL;
  return rows.find(u => aktif(u) && ((id && (u.ID_Unit === id || String(u.IMEI_1) === id)) || (im && String(u.IMEI_1) === im))) ?? null;
}

export function simpanServis(data: ServisInput): HasilServis {
  return denganLock(() => Db.transaksi(() => {
    if (!data || (data.jenis !== 'Internal' && data.jenis !== 'Pelanggan')) {
      throw new GalatBisnis('JENIS_TIDAK_VALID', 'Pilih jenis servis: Internal atau Pelanggan.');
    }
    const keluhan = sanitasi(String(data.keluhan ?? '').trim());
    if (!keluhan) throw new GalatBisnis('KELUHAN_KOSONG', 'Isi keluhan atau kerusakan perangkat.');
    const estimasi = Math.max(0, Math.round(angka(data.estimasiBiaya)));
    const pelaksana = data.pelaksana === 'Vendor luar' ? 'Vendor luar' : 'Teknisi sendiri';
    const now = sekarang();

    let unit: UnitRow | null = null;
    let perangkat = sanitasi(String(data.namaPerangkat ?? '').trim());
    let imei = String(data.imei ?? '').trim();
    if (imei === '-') imei = '';
    let namaPelanggan = '';
    let tarif = 0;

    if (data.jenis === 'Internal') {
      unit = cariUnit(data.idUnit, data.imei);
      if (!unit) throw new GalatBisnis('UNIT_TIDAK_ADA', 'Unit stok tidak ditemukan. Pilih unit yang sudah tercatat di stok.');
      if (unit.Status !== STATUS_UNIT.READY && unit.Status !== STATUS_UNIT.SERVIS) {
        throw new GalatBisnis('UNIT_TIDAK_BISA_DISERVIS', `${unit.Nama_Barang} berstatus ${unit.Status}. Hanya unit Ready atau Servis yang bisa dikirim ke servis internal.`);
      }
      perangkat = unit.Nama_Barang;
      imei = String(unit.IMEI_1);
    } else {
      if (!perangkat) throw new GalatBisnis('PERANGKAT_KOSONG', 'Isi nama perangkat yang diservis.');
      namaPelanggan = sanitasi(String(data.namaPelanggan ?? '').trim()) || 'Pelanggan Umum';
      tarif = Math.max(0, Math.round(angka(data.tarifPelanggan)));
      const wa = normalisasiWA(data.noWa || '').replace(/\D/g, '');
      if (namaPelanggan !== 'Pelanggan Umum' && wa.length >= 10) cariAtauBuatKontak(namaPelanggan, wa);
    }

    const idServis = buatId(PREFIX_ID.SERVIS);
    Db.append(SHEET.SERVIS, {
      ID_Servis: idServis, Tgl_Masuk: tglIso(now), Jam_Masuk: jamHm(now), Tgl_Selesai: '',
      Jenis: data.jenis, Pelaksana: pelaksana, Nama_Vendor: sanitasi(data.namaVendor || ''), // nama teknisi atau vendor, sesuai yang diketik
      ID_Unit: unit ? unit.ID_Unit : '', Nama_Pelanggan: namaPelanggan, Perangkat: perangkat, IMEI: imei,
      Keluhan: keluhan, Tindakan: '', Estimasi_Biaya: estimasi, Biaya_Part: 0, Biaya_Jasa_Teknisi: 0,
      Tarif_Pelanggan: tarif, Laba_Servis: 0, Status: 'Antri', ID_Klaim: data.idKlaim || '', Dibuat_Oleh: 'Owner',
    });

    let statusUnit: string | undefined;
    if (unit) {
      if (unit.Status === STATUS_UNIT.READY) ubahStatusUnit(unit.ID_Unit, STATUS_UNIT.SERVIS);
      hitungUlangModalUnit(unit.ID_Unit); // estimasi tampil, belum masuk HPP
      statusUnit = STATUS_UNIT.SERVIS;
    }
    log('Tambah', SHEET.SERVIS, idServis, `Servis ${data.jenis}: ${perangkat}`);
    return { idServis, idUnit: unit ? unit.ID_Unit : undefined, statusUnit };
  }));
}

/** Kirim unit stok ke servis internal (PRD-03: kirimKeServis) */
export function kirimKeServis(idUnit: string, data: { keluhan: string; estimasiBiaya?: number; pelaksana?: 'Teknisi sendiri' | 'Vendor luar'; namaVendor?: string }): HasilServis {
  return simpanServis({ jenis: 'Internal', idUnit, ...data });
}

export function updateStatusServis(idServis: string, status: string, opsi: SelesaiServisInput = {}): HasilStatusServis {
  return denganLock(() => Db.transaksi(() => {
    const s = Db.findById(SHEET.SERVIS, idServis);
    if (!s) throw new GalatBisnis('SERVIS_TIDAK_ADA', `Servis ${idServis} tidak ditemukan.`);
    const dari = String(s.Status);
    if (!(URUTAN[dari] || []).includes(status)) {
      throw new GalatBisnis('STATUS_TIDAK_VALID', `Servis berstatus ${dari} tidak bisa langsung menjadi ${status}.`);
    }
    const internal = s.Jenis === 'Internal';
    const idUnit = String(s.ID_Unit ?? '');
    const hasil: HasilStatusServis = { idServis, status };
    const ubah: Record<string, unknown> = { Status: status };

    if (status === 'Selesai') {
      const part = Math.round(angka(opsi.biayaPart));
      const jasa = Math.round(angka(opsi.biayaJasa));
      if (part < 0 || jasa < 0) throw new GalatBisnis('BIAYA_TIDAK_VALID', 'Biaya tidak boleh negatif.');
      const tarif = internal ? 0 : Math.round(opsi.tarifPelanggan !== undefined ? angka(opsi.tarifPelanggan) : angka(s.Tarif_Pelanggan));
      ubah.Tgl_Selesai = tglIso(sekarang());
      ubah.Biaya_Part = part;
      ubah.Biaya_Jasa_Teknisi = jasa;
      ubah.Tarif_Pelanggan = tarif;
      ubah.Laba_Servis = internal ? 0 : tarif - part - jasa;
      if (opsi.tindakan) ubah.Tindakan = sanitasi(opsi.tindakan);
      if (!internal) hasil.labaServis = tarif - part - jasa;
    }
    Db.updateById(SHEET.SERVIS, idServis, ubah);

    if (internal && idUnit) {
      const m = hitungUlangModalUnit(idUnit); // Selesai menambah modal; Batal tidak
      if (status === 'Selesai') { hasil.hppLama = m.hppLama; hasil.hppBaru = m.hppBaru; }
      let tujuan: string | undefined;
      if (status === 'Selesai' && opsi.jadikanReady) tujuan = STATUS_UNIT.READY;
      if (status === 'Batal' && opsi.unitJadi && opsi.unitJadi !== 'Servis') tujuan = opsi.unitJadi;
      if (tujuan) ubahStatusUnit(idUnit, tujuan);
      hasil.statusUnit = tujuan ?? STATUS_UNIT.SERVIS;
    }
    log('Ubah', SHEET.SERVIS, idServis, `Status ${dari} -> ${status}`);
    return hasil;
  }));
}

export function editServis(idServis: string, data: { keluhan?: string; tindakan?: string; estimasiBiaya?: number; pelaksana?: string; namaVendor?: string; perangkat?: string }): { idServis: string } {
  return denganLock(() => Db.transaksi(() => {
    const s = Db.findById(SHEET.SERVIS, idServis);
    if (!s) throw new GalatBisnis('SERVIS_TIDAK_ADA', `Servis ${idServis} tidak ditemukan.`);
    const ubah: Record<string, unknown> = {};
    if (data.keluhan !== undefined) ubah.Keluhan = sanitasi(data.keluhan);
    if (data.tindakan !== undefined) ubah.Tindakan = sanitasi(data.tindakan);
    if (data.perangkat !== undefined) ubah.Perangkat = sanitasi(data.perangkat);
    if (data.pelaksana !== undefined) ubah.Pelaksana = sanitasi(data.pelaksana);
    if (data.namaVendor !== undefined) ubah.Nama_Vendor = sanitasi(data.namaVendor);
    if (data.estimasiBiaya !== undefined) ubah.Estimasi_Biaya = Math.max(0, Math.round(angka(data.estimasiBiaya)));

    Db.updateById(SHEET.SERVIS, idServis, ubah);
    log('Ubah', SHEET.SERVIS, idServis, `Edit tiket servis ${idServis}`);
    return { idServis };
  }));
}

export function batalkanServis(idServis: string, alasan?: string): HasilStatusServis {
  const hasil = updateStatusServis(idServis, 'Batal', { unitJadi: 'Ready' });
  if (alasan) log('Batal', SHEET.SERVIS, idServis, `Batal servis ${idServis}: ${sanitasi(alasan)}`);
  return hasil;
}

