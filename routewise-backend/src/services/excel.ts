// Excel parsing service - copied and simplified from old system
import * as XLSX from 'xlsx';

type Row = Record<string, any>;

function normalizeHeader(h: string): string {
  return (h || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function isLikelyDate(v: any): boolean {
  return v && typeof v === 'object' && v instanceof Date && !isNaN(v as any);
}

function coerceCell(v: any): any {
  // Try to coerce excel serial dates
  if (typeof v === 'number' && v > 25569 && v < 60000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const ms = v * 86400000; // days → ms
    const d = new Date(epoch.getTime() + ms);
    if (!isNaN(d.getTime())) return d;
  }
  return v;
}

export function parseExcelBuffer(buf: Buffer, filename: string): { sheet: string; rows: Row[] } {
  const isCsv = /\.csv$/i.test(filename);
  const wb = isCsv
    ? XLSX.read(buf.toString('utf8'), { type: 'string' })
    : XLSX.read(buf, { type: 'buffer', cellDates: true });

  // Pick the first non-empty sheet
  let targetSheet: string | null = null;
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
    if (range.e.r >= range.s.r && range.e.c >= range.s.c) {
      targetSheet = name;
      break;
    }
  }
  if (!targetSheet) throw new Error('No sheets found / empty workbook');

  const ws = wb.Sheets[targetSheet];

  // Extract to JSON, then normalize headers & coerce cells
  const raw: Row[] = XLSX.utils.sheet_to_json(ws, {
    defval: null,
    blankrows: false,
    raw: false,
  });

  if (raw.length === 0) return { sheet: targetSheet, rows: [] };

  // Normalize keys + coerce values
  const rows: Row[] = raw.map((r) => {
    const out: Row = {};
    for (const [k, v] of Object.entries(r)) {
      const key = normalizeHeader(k);
      const val = coerceCell(v);
      out[key] = val;
    }
    return out;
  });

  return { sheet: targetSheet, rows };
}
