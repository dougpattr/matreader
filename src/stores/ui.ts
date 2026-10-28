/* Estado da interface: layout (desktop × celular), tema, movimento,
   conexão, arraste de arquivos e avisos do service worker. */
import { defineStore } from 'pinia';
import { computed, ref, watchEffect } from 'vue';
import { prefersReducedMotion } from '@/core/browser';
import { useSettingsStore } from './settings';

export type PanelId = 'entrada' | 'jornada' | 'resumo' | 'terreno' | 'documento' | 'pdfs' | 'acervo' | 'json';

export const PANELS: { id: PanelId; label: string; key: string }[] = [
  { id: 'entrada', label: 'Entrada', key: '1' },
  { id: 'jornada', label: 'Jornada', key: '2' },
  { id: 'resumo', label: 'Resumo', key: '3' },
  { id: 'terreno', label: 'Terreno', key: '4' },
  { id: 'documento', label: 'Documento', key: '5' },
  { id: 'pdfs', label: 'PDFs', key: '6' },
  { id: 'acervo', label: 'Acervo', key: '7' },
  { id: 'json', label: 'JSON', key: '8' },
];

const DESKTOP_QUERY = '(min-width: 992px)';

export const useUiStore = defineStore('ui', () => {
  const settings = useSettingsStore();
  const mqDesktop = matchMedia(DESKTOP_QUERY);
  const mqDark = matchMedia('(prefers-color-scheme: dark)');
  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');

  const isDesktop = ref(mqDesktop.matches);
  const systemDark = ref(mqDark.matches);
  const reduceMotion = ref(prefersReducedMotion());
  const online = ref(navigator.onLine);
  const dragging = ref(false);
  const focusPanel = ref<PanelId | null>(null);
  const activePanel = ref<PanelId>('entrada');
  const pwaUpdate = ref<null | (() => Promise<void>)>(null);
  const kernel = ref<'wasm' | 'ts'>('ts');

  mqDesktop.addEventListener('change', (e) => (isDesktop.value = e.matches));
  mqDark.addEventListener('change', (e) => (systemDark.value = e.matches));
  mqReduce.addEventListener('change', (e) => (reduceMotion.value = e.matches));
  addEventListener('online', () => (online.value = true));
  addEventListener('offline', () => (online.value = false));

  const dark = computed(() => settings.theme === 'escuro' || (settings.theme === 'auto' && systemDark.value));
  /** sem animação: pedido do sistema ou do próprio usuário */
  const still = computed(() => reduceMotion.value || !settings.motion);

  watchEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('ion-palette-dark', dark.value);
    root.classList.toggle('theme-noite', dark.value);
    root.classList.toggle('still', still.value);
    root.style.colorScheme = dark.value ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]:not([media])')?.setAttribute('content', dark.value ? '#23263a' : '#5f6787');
  });

  function toggleTheme() {
    settings.theme = dark.value ? 'claro' : 'escuro';
  }

  return { isDesktop, dark, still, online, dragging, focusPanel, activePanel, pwaUpdate, kernel, toggleTheme };
});
