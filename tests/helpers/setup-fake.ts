// setup-fake.ts — Spreadsheet/Drive/Trigger palsu yang MEREKAM pemanggilan format, supaya uji bisa
// memastikan SetupSheets menerapkan skema (lebar, format, dropdown, warna, proteksi) dengan benar.

type Fn = (...a: any[]) => any;

class RentangPalsu {
  constructor(private sheet: SheetSetupPalsu, public r: number, public c: number, public nr: number, public nc: number) {}
  private tulis(kunci: string, nilai: unknown) { this.sheet.catat(kunci, this, nilai); return this; }
  setValues(v: unknown[][]) {
    for (let i = 0; i < v.length; i++) for (let j = 0; j < v[i].length; j++) this.sheet.sel(this.r + i, this.c + j, v[i][j]);
    return this;
  }
  setValue(v: unknown) { this.sheet.sel(this.r, this.c, v); return this; }
  getValues() {
    const out: unknown[][] = [];
    for (let i = 0; i < this.nr; i++) out.push(Array.from({ length: this.nc }, (_, j) => this.sheet.ambil(this.r + i, this.c + j)));
    return out;
  }
  getValue() { return this.sheet.ambil(this.r, this.c); }
  setNumberFormats(f: string[][]) { return this.tulis('numberFormats', f); }
  setHorizontalAlignments(f: string[][]) { return this.tulis('alignments', f); }
  setWrapStrategies(f: unknown[][]) { return this.tulis('wrapStrategies', f); }
  setDataValidation(v: unknown) { return this.tulis('validation', v); }
  setBackground(v: string) { return this.tulis('background', v); }
  setFontColor(v: string) { return this.tulis('fontColor', v); }
  setFontWeight(v: string) { return this.tulis('fontWeight', v); }
  setFontSize(v: number) { return this.tulis('fontSize', v); }
  setVerticalAlignment(v: string) { return this.tulis('vAlign', v); }
  setHorizontalAlignment(v: string) { return this.tulis('hAlign', v); }
  setWrap(v: boolean) { return this.tulis('wrap', v); }
  setNumberFormat(v: string) { return this.tulis('numberFormat', v); }
  applyRowBanding() {
    const b: any = { dihapus: false, warna: {} };
    b.setHeaderRowColor = (c: string) => { b.warna.header = c; return b; };
    b.setFirstRowColor = (c: string) => { b.warna.pertama = c; return b; };
    b.setSecondRowColor = (c: string) => { b.warna.kedua = c; return b; };
    b.remove = () => { b.dihapus = true; };
    this.sheet.banding.push(b);
    return b;
  }
  createFilter() { this.sheet.filter = { r: this.r, nr: this.nr, nc: this.nc, remove: () => { this.sheet.filter = null; } }; return this.sheet.filter; }
  clearContent() { return this; }
}

export class SheetSetupPalsu {
  sel_: Map<string, unknown> = new Map();
  catatan_: Array<{ kunci: string; r: number; c: number; nr: number; nc: number; nilai: unknown }> = [];
  lebar: Record<number, number> = {};
  tinggi: Record<number, number> = {};
  banding: any[] = [];
  filter: any = null;
  frozenRows = 0;
  frozenCols = 0;
  tab = '';
  aturan: any[] = [];
  proteksi: any[] = [];
  maxRows = 1000;
  maxCols = 26;
  constructor(public nama: string) {}
  catat(kunci: string, rg: RentangPalsu, nilai: unknown) { this.catatan_.push({ kunci, r: rg.r, c: rg.c, nr: rg.nr, nc: rg.nc, nilai }); }
  sel(r: number, c: number, v: unknown) { this.sel_.set(`${r},${c}`, v); }
  ambil(r: number, c: number) { return this.sel_.get(`${r},${c}`) ?? ''; }
  getRange(r: number, c: number, nr = 1, nc = 1) { return new RentangPalsu(this, r, c, nr, nc); }
  getLastRow() { let m = 0; this.sel_.forEach((v, k) => { if (v !== '') m = Math.max(m, Number(k.split(',')[0])); }); return m; }
  getLastColumn() { let m = 0; this.sel_.forEach((v, k) => { if (v !== '') m = Math.max(m, Number(k.split(',')[1])); }); return m || 1; }
  getMaxRows() { return this.maxRows; }
  getMaxColumns() { return this.maxCols; }
  insertRowsAfter(_p: number, n: number) { this.maxRows += n; }
  insertColumnsAfter(_p: number, n: number) { this.maxCols += n; }
  deleteRows(_p: number, n: number) { this.maxRows -= n; }
  deleteColumns(_p: number, n: number) { this.maxCols -= n; }
  setColumnWidth(c: number, w: number) { this.lebar[c] = w; }
  setRowHeight(r: number, h: number) { this.tinggi[r] = h; }
  setFrozenRows(n: number) { this.frozenRows = n; }
  setFrozenColumns(n: number) { this.frozenCols = n; }
  setTabColor(c: string) { this.tab = c; }
  getBandings() { return this.banding.filter(b => !b.dihapus); }
  getFilter() { return this.filter; }
  setConditionalFormatRules(r: any[]) { this.aturan = r; }
  getProtections() { return this.proteksi.filter(p => !p.dihapus); }
  protect() {
    const p: any = { dihapus: false, warningOnly: false, deskripsi: '', bebas: [] };
    p.setDescription = (d: string) => { p.deskripsi = d; return p; };
    p.setWarningOnly = (w: boolean) => { p.warningOnly = w; return p; };
    p.setUnprotectedRanges = (r: any[]) => { p.bebas = r; return p; };
    p.remove = () => { p.dihapus = true; };
    this.proteksi.push(p);
    return p;
  }
  private geser(dari: number, delta: number) {
    // Geser semua sel pada kolom >= dari sebesar delta
    const baru = new Map<string, unknown>();
    this.sel_.forEach((v, k) => { const [r, c] = k.split(',').map(Number); baru.set(`${r},${c >= dari ? c + delta : c}`, v); });
    this.sel_ = baru;
  }
  insertColumnBefore(pos: number) { this.geser(pos, 1); this.maxCols += 1; }
  insertColumnAfter(pos: number) { this.geser(pos + 1, 1); this.maxCols += 1; }
  moveColumns(rg: { c: number }, tujuan: number) {
    // Pindahkan satu kolom: koordinat tujuan berdasarkan sebelum pemindahan
    const asal = rg.c;
    const peta = (c: number) => (c === asal ? (tujuan <= asal ? tujuan : tujuan - 1) : tujuan <= asal ? (c >= tujuan && c < asal ? c + 1 : c) : (c > asal && c < tujuan ? c - 1 : c));
    const baru = new Map<string, unknown>();
    this.sel_.forEach((v, k) => { const [r, c] = k.split(',').map(Number); baru.set(`${r},${peta(c)}`, v); });
    this.sel_ = baru;
  }
  /** Nilai pada pemanggilan format terakhir yang menutupi sel (r,c) */
  format(kunci: string, r: number, c: number) {
    const cat = [...this.catatan_].reverse().find(x => x.kunci === kunci && r >= x.r && r < x.r + x.nr && c >= x.c && c < x.c + x.nc);
    if (!cat) return undefined;
    const n: any = cat.nilai;
    return Array.isArray(n) ? n[r - cat.r][c - cat.c] : n;
  }
  validasiKolom(c: number) { return [...this.catatan_].reverse().find(x => x.kunci === 'validation' && x.c === c)?.nilai as any; }
}

export interface SetupPalsu {
  sheets: Record<string, SheetSetupPalsu>;
  trigger: Array<{ fungsi: string; jam: number; mingguan: boolean }>;
  folder: string[];
  spreadsheet: { id: string; locale: string; tz: string; dipindahKe: string | null; dibuat: number };
  props: Map<string, string>;
  urutanTab: string[];
}

export function pasangSetupFake(): SetupPalsu {
  const g = globalThis as any;
  const sheets: Record<string, SheetSetupPalsu> = { Sheet1: new SheetSetupPalsu('Sheet1') };
  const hasil: SetupPalsu = {
    sheets, trigger: [], folder: [], props: new Map(), urutanTab: [],
    spreadsheet: { id: 'ss-baru', locale: '', tz: '', dipindahKe: null, dibuat: 0 },
  };
  const folderById = new Map<string, string>();
  const buatFolder = (jalur: string): any => {
    if (!folderById.has(jalur)) { hasil.folder.push(jalur); folderById.set(jalur, 'fld-' + hasil.folder.length); }
    return {
      getId: () => folderById.get(jalur),
      getFoldersByName: (n: string) => { const j = `${jalur}/${n}`; const ada = folderById.has(j); return { hasNext: () => ada, next: () => buatFolder(j) }; },
      createFolder: (n: string) => buatFolder(`${jalur}/${n}`),
    };
  };
  const root = buatFolder('(root)'); hasil.folder.pop();
  g.DriveApp = {
    getRootFolder: () => ({ ...root, getFoldersByName: (n: string) => { const ada = folderById.has(n); return { hasNext: () => ada, next: () => buatFolder(n) }; }, createFolder: (n: string) => buatFolder(n) }),
    getFilesByName: () => ({ hasNext: () => hasil.spreadsheet.dibuat > 0, next: () => ({}) }),
    getFileById: () => ({ moveTo: (f: any) => { hasil.spreadsheet.dipindahKe = f.getId(); } }),
  };
  const buatSS: any = {
    getId: () => hasil.spreadsheet.id, getUrl: () => 'https://docs.google.com/spreadsheets/d/ss-baru',
    setSpreadsheetTimeZone: (t: string) => { hasil.spreadsheet.tz = t; },
    setSpreadsheetLocale: (l: string) => { hasil.spreadsheet.locale = l; },
    getSheetByName: (n: string) => sheets[n] ?? null,
    insertSheet: (n: string) => (sheets[n] = new SheetSetupPalsu(n)),
    deleteSheet: (s: SheetSetupPalsu) => { delete sheets[s.nama]; },
    getSheets: () => Object.values(sheets),
    setActiveSheet: (s: SheetSetupPalsu) => { (buatSS._aktif = s); },
    moveActiveSheet: (pos: number) => { const n = buatSS._aktif.nama; hasil.urutanTab = hasil.urutanTab.filter(x => x !== n); hasil.urutanTab.splice(pos - 1, 0, n); },
    getRange: (a1: string) => ({ a1 }),
  };
  g.SpreadsheetApp = {
    create: () => { hasil.spreadsheet.dibuat++; return buatSS; },
    open: () => buatSS,
    openById: () => buatSS,
    WrapStrategy: { WRAP: 'WRAP', CLIP: 'CLIP' },
    BandingTheme: { LIGHT_GREY: 'LIGHT_GREY' },
    ProtectionType: { SHEET: 'SHEET' },
    newDataValidation: () => {
      const v: any = {};
      v.requireValueInList = (l: string[]) => { v.daftar = l; return v; };
      v.requireValueInRange = (r: any) => { v.rentang = r.a1; return v; };
      v.setAllowInvalid = (a: boolean) => { v.lunak = a; return v; };
      v.setHelpText = (t: string) => { v.bantuan = t; return v; };
      v.build = () => v;
      return v;
    },
    newConditionalFormatRule: () => {
      const r: any = {};
      r.whenFormulaSatisfied = (f: string) => { r.rumus = f; return r; };
      r.setBackground = (c: string) => { r.bg = c; return r; };
      r.setFontColor = (c: string) => { r.fg = c; return r; };
      r.setRanges = (x: any[]) => { r.rentang = x; return r; };
      r.build = () => r;
      return r;
    },
  };
  g.ScriptApp = {
    WeekDay: { SUNDAY: 'SUNDAY' },
    getProjectTriggers: () => hasil.trigger.map(t => ({ getHandlerFunction: () => t.fungsi, _t: t })),
    deleteTrigger: (x: any) => { hasil.trigger = hasil.trigger.filter(t => t !== x._t); },
    newTrigger: (fungsi: string) => {
      const t = { fungsi, jam: -1, mingguan: false };
      const b: any = {};
      b.timeBased = () => b; b.inTimezone = () => b; b.nearMinute = () => b; b.everyDays = () => b; b.everyWeeks = () => b;
      b.atHour = (h: number) => { t.jam = h; return b; };
      b.onWeekDay = () => { t.mingguan = true; return b; };
      b.create = () => { hasil.trigger.push(t); };
      return b;
    },
  };
  g.PropertiesService = { getScriptProperties: () => ({ getProperty: (k: string) => hasil.props.get(k) ?? null, setProperty: (k: string, v: string) => { hasil.props.set(k, v); } }) };
  g.Logger = { log: () => {} };
  // Log.ts menulis lewat Db -> butuh sheet Log_Aktivitas; sediakan CacheService/LockService minimal
  g.CacheService = { getScriptCache: () => ({ get: () => null, put: () => {}, remove: () => {} }) };
  g.LockService = { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) };
  g.Utilities = { formatDate: (d: Date, _tz: string, f: string) => (f === 'yyyy-MM-dd' ? d.toISOString().slice(0, 10) : f === 'HH:mm' ? '10:00' : d.toISOString()) };
  return hasil;
}
