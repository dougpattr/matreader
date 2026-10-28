/* Formatação e leitura de números, datas e tamanhos no padrão brasileiro.
   Funções puras: nada aqui toca no DOM. */

export const NBSP = String.fromCharCode(0xa0);

export function fmt(n: number, dec = 2): string {
  if (!Number.isFinite(n)) return '—';
  return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export function fmtInt(n: number): string {
  return Number.isFinite(n) ? Math.round(n).toLocaleString('pt-BR') : '—';
}

export function fmtArea(m2: number): string {
  if (!Number.isFinite(m2)) return '—';
  return m2 >= 10000 ? `${fmt(m2)} m²${NBSP}·${NBSP}${fmt(m2 / 10000, 4)} ha` : `${fmt(m2)} m²`;
}

export function fmtMoney(v: unknown): string | null {
  const n = parseNum(v);
  return Number.isFinite(n) ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null;
}

export function fmtBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${fmt(bytes / 1024, 1)} KB`;
  if (bytes < 1024 ** 3) return `${fmt(bytes / 1024 / 1024, 1)} MB`;
  return `${fmt(bytes / 1024 ** 3, 2)} GB`;
}

/** 65000 ms → "1:05" */
export function fmtClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** 4200 ms → "4,2 s"; 95000 → "1 min 35 s" */
export function fmtDuration(ms: number): string {
  if (!Number.isFinite(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = ms / 1000;
  if (s < 60) return `${fmt(s, 1)} s`;
  const m = Math.floor(s / 60);
  return `${m} min ${Math.round(s - m * 60)} s`;
}

/** Número em qualquer formato que aparece em matrícula:
 *  "1.234,56" · "1,234.56" · "1234,56" · "1234.56" · "12 345,6 m" */
export function parseNum(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
  if (v === null || v === undefined || typeof v === 'boolean') return NaN;
  let s = String(v)
    .trim()
    .replace(/\s/g, '')
    .replace(/m²|m2|ha|mts?\.?|metros?/gi, '');
  if (!s) return NaN;
  const neg = /^-/.test(s);
  s = s.replace(/[^\d.,]/g, '');
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot >= 0 && lastComma >= 0) {
    s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (lastComma >= 0) {
    const decimals = s.length - lastComma - 1;
    const manyCommas = s.split(',').length - 1 > 1;
    const thousands = decimals === 3 && /^\d{1,3}(,\d{3})+$/.test(s);
    s = manyCommas || thousands ? s.replace(/,/g, '') : s.replace(',', '.');
  } else if (lastDot >= 0 && /^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? (neg ? -n : n) : NaN;
}

/** "1/3" ou "33,33%" viram número (porcentagem). */
export function parsePct(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).trim();
  const frac = s.match(/^(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)$/);
  if (frac) {
    const a = parseNum(frac[1]);
    const b = parseNum(frac[2]);
    if (Number.isFinite(a) && Number.isFinite(b) && b) return Math.round((a / b) * 10000) / 100;
  }
  const n = parseNum(s.replace('%', ''));
  return Number.isFinite(n) ? n : null;
}

/** "2023-05-19" → "19/05/2023"; outros formatos passam como estão. */
export function fmtDate(str: unknown): string {
  if (!str) return '';
  const s = String(str).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
}

/** Data em milissegundos (UTC) a partir de ISO ou dd/mm/aaaa; NaN se não der. */
export function dateValue(str: unknown): number {
  if (!str) return NaN;
  const s = String(str).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})/);
  if (m) return Date.UTC(+m[3], +m[2] - 1, +m[1]);
  const t = Date.parse(s);
  return Number.isNaN(t) ? NaN : t;
}

export function timeAgo(ts: number, now = Date.now()): string {
  const s = Math.floor((now - ts) / 1000);
  if (s < 60) return 'agora';
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'ontem' : `há ${d} dias`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
