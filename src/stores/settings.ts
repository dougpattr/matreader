/* Preferências do usuário, guardadas neste aparelho. */
import { defineStore } from 'pinia';
import { local } from '@/core/browser';
import type { OcrMode } from '@/services/extract/text-extraction';

export type ThemeMode = 'auto' | 'claro' | 'escuro';
export type SendPdfMode = 'auto' | 'sempre' | 'nunca';

export interface SettingsState {
  flowUrl: string;
  /** PDF em base64 junto do texto: só o fluxo antigo precisa */
  sendPdf: SendPdfMode;
  ocrMode: OcrMode;
  timeoutMin: number;
  autosave: boolean;
  motion: boolean;
  theme: ThemeMode;
  removeLinks: boolean;
  geoMode: 'sat' | 'draw';
  /** aprendido pela resposta: v2 = scope do MatReader, v1 = fluxo antigo */
  flowContract: 'v2' | 'v1' | null;
}

const KEY = 'matreader:settings:v2';
const KEY_V1 = 'matreader:settings:v1';

const defaults = (): SettingsState => ({
  flowUrl: import.meta.env.VITE_DEFAULT_FLOW_URL ?? '',
  sendPdf: 'auto',
  ocrMode: 'auto',
  timeoutMin: 10,
  autosave: true,
  motion: true,
  theme: 'auto',
  removeLinks: true,
  geoMode: 'sat',
  flowContract: null,
});

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => {
    let saved = local.json<Partial<SettingsState> | null>(KEY, null);
    if (!saved) {
      // v1 → v2: o protocolo por tarefa pede mais tempo-limite (o agente leva minutos)
      saved = local.json<Partial<SettingsState>>(KEY_V1, {});
      saved.timeoutMin = Math.max(10, saved.timeoutMin ?? 10);
    }
    // URL da versão anterior (mat_webhook) continua valendo
    const legacyUrl = local.get('mat_webhook') ?? local.get('mat_webhook_url') ?? '';
    return { ...defaults(), flowUrl: legacyUrl, ...saved };
  },
  getters: {
    shouldSendPdf(s): boolean {
      if (s.sendPdf === 'sempre') return true;
      if (s.sendPdf === 'nunca') return false;
      return s.flowContract !== 'v2';
    },
    /** https em produção; http só para localhost (fluxo simulado em testes) */
    flowConfigured: (s) => /^https:\/\//i.test(s.flowUrl.trim()) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(s.flowUrl.trim()),
  },
  actions: {
    persist() {
      local.setJson(KEY, this.$state);
    },
    resetFlow() {
      this.flowUrl = defaults().flowUrl;
      this.flowContract = null;
    },
  },
});
