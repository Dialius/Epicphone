// gas-fake.ts — Apps Script palsu di memori (Spreadsheet, Lock, Properties, Cache, Utilities)
// supaya kode layanan yang asli bisa dijalankan dan diuji tanpa Google.

import { HEADER } from '../../src/backend/Skema';

type Sel = unknown;

export class SheetPalsu {
  rows: Sel[][];
  gagalTulis = false;
  constructor(public nama: string, headers: string[]) {
    this.rows = [headers.slice()];
  }
  getLastRow() {
    for (let i = this.rows.length - 1; i >= 0; i--) {
      if (this.rows[i].some(c => c !== '' && c !== undefined && c !== null)) return i + 1;
    }
    return 0;
  }
  getLastColumn() { return this.rows[0].length; }
  getName() { return this.nama; }
  insertColumnBefore(pos: number) { this.rows.forEach(r => r.splice(pos - 1, 0, '')); }
  insertColumnAfter(pos: number) { this.rows.forEach(r => r.splice(pos, 0, '')); }
  setColumnWidth() { /* tidak perlu pada palsu */ }
  getMaxRows() { return this.rows.length + 100; }
  insertRowsAfter() { /* tidak perlu pada palsu */ }
  getRange(r: number, c: number, nr = 1, nc = 1) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return {
      getValues(): Sel[][] {
        const out: Sel[][] = [];
        for (let i = 0; i < nr; i++) {
          const row = self.rows[r - 1 + i] || [];
          out.push(Array.from({ length: nc }, (_, j) => row[c - 1 + j] ?? ''));
        }
        return out;
      },
      setValues(v: Sel[][]) {
        if (self.gagalTulis && r > 1) throw new Error('simulasi: gagal menulis ke ' + self.nama);
        for (let i = 0; i < nr; i++) {
          while (self.rows.length < r + i) self.rows.push(new Array(self.rows[0].length).fill(''));
          for (let j = 0; j < nc; j++) self.rows[r - 1 + i][c - 1 + j] = v[i][j];
        }
      },
      setValue(v: Sel) { self.rows[r - 1][c - 1] = v; return this; },
      setNumberFormat() { return this; },
      clearContent() {
        for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) {
          if (self.rows[r - 1 + i]) self.rows[r - 1 + i][c - 1 + j] = '';
        }
      },
    };
  }
  /** Baris data sebagai objek (melewati baris kosong) — untuk asersi */
  data(): Array<Record<string, any>> {
    const h = this.rows[0] as string[];
    return this.rows.slice(1).filter(r => r[0] !== '' && r[0] !== undefined).map(r => Object.fromEntries(h.map((k, i) => [k, r[i]])));
  }
}

export interface Palsu {
  sheet: (nama: string) => SheetPalsu;
  props: Map<string, string>;
  cache: Map<string, string>;
  lockDipegang: () => boolean;
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function formatDate(d: Date, tz: string, fmt: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d);
  const p: Record<string, string> = {};
  parts.forEach(x => { p[x.type] = x.value; });
  const jam = p.hour === '24' ? '00' : p.hour;
  return fmt.replace(/yyyy|yy|MMM|MM|dd|HH|mm/g, t => ({
    yyyy: p.year, yy: p.year.slice(2), MMM: BULAN[Number(p.month) - 1], MM: p.month, dd: p.day, HH: jam, mm: p.minute,
  } as Record<string, string>)[t]);
}

export function pasangGasFake(): Palsu {
  const sheets: Record<string, SheetPalsu> = {};
  Object.keys(HEADER).forEach(n => { sheets[n] = new SheetPalsu(n, HEADER[n]); });
  const props = new Map<string, string>([['SPREADSHEET_ID', 'ss-palsu']]);
  const cache = new Map<string, string>();
  let dipegang = false;

  const g = globalThis as any;
  g.Utilities = { formatDate };
  g.LockService = {
    getScriptLock: () => ({
      // Meniru Apps Script: bila kunci sedang dipegang eksekusi ini, meminta lagi akan menunggu selamanya
      tryLock: () => { if (dipegang) return false; dipegang = true; return true; },
      waitLock: () => { if (dipegang) throw new Error('simulasi: kunci bersarang (deadlock)'); dipegang = true; },
      releaseLock: () => { dipegang = false; },
    }),
  };
  g.PropertiesService = {
    getScriptProperties: () => ({
      getProperty: (k: string) => props.get(k) ?? null,
      setProperty: (k: string, v: string) => { props.set(k, v); },
    }),
  };
  g.CacheService = {
    getScriptCache: () => ({
      get: (k: string) => cache.get(k) ?? null,
      put: (k: string, v: string) => { cache.set(k, v); },
      remove: (k: string) => { cache.delete(k); },
      removeAll: (ks: string[]) => { ks.forEach(k => cache.delete(k)); },
    }),
  };
  g.SpreadsheetApp = {
    openById: () => ({ getSheetByName: (n: string) => sheets[n] ?? null, getSheets: () => Object.values(sheets), getId: () => 'ss-palsu' }),
  };
  g.DriveApp = {};
  g.Logger = { log: () => {} };

  return { sheet: n => sheets[n], props, cache, lockDipegang: () => dipegang };
}
