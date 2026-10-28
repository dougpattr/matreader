/* Texto: escape de HTML, ausência de valor e normalização. */

/** Escapa para inserir com segurança em HTML montado à mão. */
export function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Valor que falta é ausência — nunca zero nem "Ativa" inventado. */
export function val<T>(v: T | null | undefined): T | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string' && !v.trim()) return null;
  return v;
}

/** Texto pronto para exibir, com reserva para ausência. */
export function show(v: unknown, fallback = '—'): string {
  const x = val(v);
  return x === null ? fallback : String(x);
}

export function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '');
}

/** Chave estável: sem acento, maiúscula, só letras e dígitos. */
export function slug(s: unknown, max = 28): string {
  return stripAccents(String(s ?? ''))
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, max);
}

export function onlyDigits(s: unknown): string {
  return String(s ?? '').replace(/\D/g, '');
}

/** Nome comparável: sem acento, sem pontuação, espaços simples. */
export function normName(s: unknown): string {
  return stripAccents(String(s ?? ''))
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}

/** Nome de arquivo seguro para Windows, macOS e Linux. */
export function safeFileName(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '_').slice(0, 120);
}
