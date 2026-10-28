/* Limpeza do texto antes de enviar ao agente: tira cabeçalhos e rodapés
   que se repetem nas bordas de quase toda página (selo, "página x de y",
   aviso de certidão digital), junta palavras hifenizadas e marca o início
   de cada página. A primeira ocorrência de cada cabeçalho é mantida — ele
   costuma trazer o número da matrícula. Menos ruído = menos tokens e
   menos confusão para a IA. Função pura. */

const PAGE_NUMBER = /^(p[aá]g(ina)?\.?\s*)?\d{1,3}\s*(\/|de)\s*\d{1,3}$/i;
const EDGE = 3;

function normLine(l: string): string {
  return l.toLowerCase().replace(/\d+/g, '#').replace(/\s+/g, ' ').trim();
}

/** Índices das linhas não vazias que ficam nas bordas da página. */
function edgeIndexes(lines: string[]): Set<number> {
  const filled = lines.map((l, i) => (l ? i : -1)).filter((i) => i >= 0);
  if (filled.length <= EDGE * 2) return new Set();
  return new Set([...filled.slice(0, EDGE), ...filled.slice(-EDGE)]);
}

export function cleanText(pages: string[]): { text: string; removedLines: number } {
  const split = pages.map((p) =>
    p
      .replace(/\r/g, '')
      .split('\n')
      .map((l) => l.replace(/[ \t\xa0]+/g, ' ').trim()),
  );
  const edges = split.map(edgeIndexes);

  // linhas de borda que se repetem em ≥ 60% das páginas (com 3+ páginas)
  const counts = new Map<string, number>();
  if (split.length >= 3) {
    split.forEach((lines, p) => {
      const seen = new Set<string>();
      edges[p]!.forEach((i) => {
        const l = lines[i]!;
        if (l.length >= 4 && l.length <= 160) seen.add(normLine(l));
      });
      seen.forEach((k) => counts.set(k, (counts.get(k) ?? 0) + 1));
    });
  }
  const limit = Math.max(3, Math.ceil(split.length * 0.6));
  const keptOnce = new Set<string>();
  let removed = 0;

  const out = split.map((lines, p) => {
    const kept = lines.filter((l, i) => {
      if (!l) return true;
      if (PAGE_NUMBER.test(l)) {
        removed++;
        return false;
      }
      if (edges[p]!.has(i)) {
        const k = normLine(l);
        if ((counts.get(k) ?? 0) >= limit) {
          if (!keptOnce.has(k)) {
            keptOnce.add(k);
            return true;
          }
          removed++;
          return false;
        }
      }
      return true;
    });
    const body = kept
      .join('\n')
      .replace(/(\p{L})-\n(\p{Ll})/gu, '$1$2') // pala-\nvra → palavra
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    return body ? `=== Página ${p + 1} ===\n${body}` : '';
  });
  return { text: out.filter(Boolean).join('\n\n'), removedLines: removed };
}
