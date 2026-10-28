/* Prompts de extração. Os textos vivem em .txt para serem lidos também
   pelo gerador do scope do Power Automate (scripts/make-scope.mjs). */
import agente from './agente.txt?raw';
import completo from './extracao-completo.txt?raw';
import compacto from './extracao-compacto.txt?raw';

export type PromptKind = 'completo' | 'compacto' | 'agente';

export const PROMPTS: Record<PromptKind, { title: string; hint: string; text: string }> = {
  completo: {
    title: 'Completo',
    hint: 'com verificação completa (CoVe) — para colar numa IA junto com o PDF',
    text: completo.trim(),
  },
  compacto: {
    title: 'Compacto',
    hint: 'enxuto, para IA com limite de texto',
    text: compacto.trim(),
  },
  agente: {
    title: 'Agente (fluxo)',
    hint: 'o mesmo que o scope do Power Automate envia ao agente do Copilot Studio',
    text: agente.trim(),
  },
};
