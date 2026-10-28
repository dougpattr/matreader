/* Estado de tela do Terreno (modo, medidas, opacidade, dicas). Os ajustes
   que mudam a geometria (giro, espelho, âncora) ficam na matrícula. */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useSettingsStore } from './settings';

export const useTerrainStore = defineStore('terrain', () => {
  const settings = useSettingsStore();
  const mode = ref<'sat' | 'draw'>(settings.geoMode);
  const measures = ref(false);
  const opacity = ref(0.28);
  const fitOpen = ref(false);
  const hint = ref('');
  const hintTone = ref<'info' | 'wheel'>('info');
  let timer: ReturnType<typeof setTimeout> | undefined;

  function setMode(m: 'sat' | 'draw') {
    mode.value = m;
    settings.geoMode = m;
  }
  function showHint(text: string, ms = 3200, tone: 'info' | 'wheel' = 'info') {
    clearTimeout(timer);
    hint.value = text;
    hintTone.value = tone;
    if (ms > 0) timer = setTimeout(() => (hint.value = ''), ms);
  }
  function hideHint() {
    clearTimeout(timer);
    hint.value = '';
  }
  return { mode, measures, opacity, fitOpen, hint, hintTone, setMode, showHint, hideHint };
});
