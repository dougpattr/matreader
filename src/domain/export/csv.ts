/* Planilha do acervo (CSV com ; e BOM — abre direto no Excel em pt-BR). */

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'number' ? (Number.isFinite(v) ? v.toLocaleString('pt-BR') : '') : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return String.fromCharCode(0xfeff) + rows.map((r) => r.map(cell).join(';')).join('\r\n');
}
