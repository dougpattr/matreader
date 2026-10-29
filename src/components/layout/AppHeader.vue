<script setup lang="ts">
/* Cabeçalho flutuante: uma ilha de papel que paira sobre o conteúdo, com
   folga em todos os lados. Marca escrita (sem monograma) com um traço de
   pena por baixo; no desktop, atalhos para os blocos com uma pílula de
   papel que desliza (com mola) até o bloco ativo — o mesmo selo dos
   segmentos e da barra de abas; à direita, as ações globais em botões
   redondos. Sai de cena no modo tela cheia. */
import { IonHeader } from '@ionic/vue';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useAppActions } from '@/app/actions';
import Icon from '@/components/ink/Icon.vue';
import InkFrame from '@/components/ink/InkFrame.vue';
import { useLibraryStore } from '@/stores/library';
import { useMatriculaStore } from '@/stores/matricula';
import { useModalsStore } from '@/stores/modals';
import { PANELS, useUiStore } from '@/stores/ui';

defineProps<{ title?: string }>();
const ui = useUiStore();
const mat = useMatriculaStore();
const lib = useLibraryStore();
const modals = useModalsStore();
const actions = useAppActions();
const saveChip = computed(() => (lib.saveStatus.text ? lib.saveStatus : null));

/* pílula que desliza até o atalho ativo */
const nav = ref<HTMLElement | null>(null);
const ink = ref({ x: 0, w: 0, ready: false });
let ro: ResizeObserver | null = null;

function placeInk() {
  const btn = nav.value?.querySelector<HTMLElement>(`[data-jump="${ui.activePanel}"]`);
  if (!btn) return;
  ink.value = { x: btn.offsetLeft, w: btn.offsetWidth, ready: true };
}

watch(
  () => ui.activePanel,
  () => void nextTick(placeInk),
);
watch(
  () => ui.isDesktop,
  (desk) => {
    if (desk) void nextTick(() => {
      if (nav.value) ro?.observe(nav.value);
      placeInk();
    });
  },
);
onMounted(() => {
  ro = new ResizeObserver(placeInk);
  if (nav.value) ro.observe(nav.value);
  placeInk();
  void document.fonts?.ready.then(placeInk);
});
onBeforeUnmount(() => ro?.disconnect());
</script>

<template>
  <ion-header class="app-header" :class="{ desk: ui.isDesktop, away: !!ui.focusPanel }">
    <div class="island live-frame">
      <InkFrame seed="cabecalho" :radius="40" :jitter="0.9" :draw="!ui.still" live />

      <a class="brand" href="#/tabs/inicio" aria-label="MatReader — início">
        <span class="word" aria-hidden="true"><span class="w-mat">Mat</span><span class="w-reader">Reader</span><i class="w-drop" /></span>
        <svg class="swash" viewBox="0 0 132 10" preserveAspectRatio="none" aria-hidden="true"><path d="M2 7.4C26 3.6 58 3.2 92 4.4c14 .5 26 .2 38-1.6-11 3.4-24 4.6-38 4.6-30 0-58-.6-90 0z" /></svg>
        <small v-if="ui.isDesktop" class="tagline">matrículas · terreno · acervo</small>
        <small v-else-if="title" class="tagline">{{ title }}</small>
      </a>

      <nav v-if="ui.isDesktop" ref="nav" class="jump" aria-label="Ir para um bloco">
        <button
          v-for="p in PANELS"
          :key="p.id"
          type="button"
          :data-jump="p.id"
          :class="{ on: ui.activePanel === p.id }"
          :aria-current="ui.activePanel === p.id ? 'location' : undefined"
          :title="`${p.label} (tecla ${p.key})`"
          @click="actions.goTo(p.id)"
        >
          {{ p.label }}
        </button>
        <span class="jump-pill" :class="{ ready: ink.ready }" :style="{ transform: `translateX(${ink.x}px)`, width: `${ink.w}px` }" aria-hidden="true" />
      </nav>

      <div class="actions">
        <span v-if="!ui.online" class="chip chip--mute" title="Sem internet: mapa de satélite e conversão por IA indisponíveis"><Icon name="offline" size="sm" />offline</span>
        <span v-if="ui.isDesktop && saveChip" class="chip save-chip wide-only" :class="`chip--${saveChip.kind || 'mute'}`">{{ saveChip.text }}</span>
        <template v-if="ui.isDesktop">
          <button type="button" class="ink-round sm ghost wide-only" aria-label="Nova matrícula" title="Fechar esta matrícula e começar outra" :disabled="!mat.data" @click="actions.newMatricula()"><Icon name="new" size="sm" /></button>
          <button type="button" class="ink-round sm ghost wide-only" aria-label="Imprimir" title="Imprimir ou salvar em PDF (Ctrl+P)" :disabled="!mat.data" @click="actions.print()"><Icon name="print" size="sm" /></button>
          <span class="sep wide-only" aria-hidden="true" />
        </template>
        <button type="button" class="ink-round sm" :aria-label="ui.dark ? 'Tema papel' : 'Tema noite'" :title="ui.dark ? 'Voltar ao tema papel' : 'Tema noite'" @click="ui.toggleTheme()"><Icon :name="ui.dark ? 'sun' : 'moon'" size="sm" /></button>
        <button type="button" class="ink-round sm" aria-label="Configurações" title="Configurações" @click="modals.settings = true"><Icon name="gear" size="sm" /></button>
        <button type="button" class="ink-round sm" aria-label="Ajuda" title="Como usar (tecla ?)" @click="modals.help = true"><Icon name="help" size="sm" /></button>
      </div>
    </div>
  </ion-header>
</template>

<style scoped>
/* a faixa do cabeçalho é transparente e não captura cliques: só a ilha */
.app-header {
  position: absolute;
  inset: 0 0 auto;
  z-index: 40;
  padding: calc(var(--safe-top) + var(--float-gap)) var(--gutter) 0;
  pointer-events: none;
  box-shadow: none;
  transition:
    transform var(--d3) var(--ease),
    opacity var(--d2) var(--ease);
}
/* véu de papel atrás da ilha: o conteúdo esmaece ao passar por baixo */
.app-header::before {
  content: '';
  position: absolute;
  inset: 0 0 calc(-1 * var(--float-gap));
  z-index: -1;
  background: linear-gradient(to bottom, var(--paper) 0%, color-mix(in srgb, var(--paper) 82%, transparent) 55%, transparent 100%);
  pointer-events: none;
}
.app-header.away {
  transform: translateY(calc(-100% - 12px));
  opacity: 0;
}
.island {
  --accent: var(--rose-ink);
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--s4);
  max-width: calc(1760px - 2 * var(--gutter));
  height: var(--header-h);
  margin: 0 auto;
  /* o último botão redondo fica concêntrico com a ponta da pílula */
  padding: 0 calc((var(--header-h) - var(--h-sm)) / 2) 0 26px;
  border-radius: var(--r-pill);
  background: var(--glass) var(--grain);
  -webkit-backdrop-filter: blur(16px) saturate(1.3);
  backdrop-filter: blur(16px) saturate(1.3);
  box-shadow: var(--shadow-lift);
  pointer-events: auto;
  animation: island-in var(--d4) var(--ease) backwards;
}
@keyframes island-in {
  from {
    opacity: 0;
    transform: translateY(-14px) scale(0.98);
  }
}

/* ---------- marca ---------- */
.brand {
  position: relative;
  display: grid;
  justify-items: start;
  gap: 1px;
  flex: none;
  padding: 4px 0 2px;
  color: var(--ink);
  text-decoration: none;
}
.brand:focus-visible {
  border-radius: 10px;
}
.word {
  display: inline-flex;
  align-items: baseline;
  font: 800 18px/1 var(--f-display);
  letter-spacing: 0.005em;
}
.w-reader {
  font-weight: 700;
  color: var(--slate-2);
}
.w-drop {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-left: 3px;
  border-radius: 50% 50% 50% 0;
  background: var(--rose-ink);
  transform: rotate(-45deg);
  animation: drop-fall 6s var(--ease-in-out) 1.4s infinite;
}
@keyframes drop-fall {
  0%,
  86%,
  100% {
    transform: rotate(-45deg) translate(0, 0);
  }
  90% {
    transform: rotate(-45deg) translate(1.5px, -3px);
  }
  94% {
    transform: rotate(-45deg) translate(-0.5px, 1px);
  }
}
/* pincelada sob "Reader": fina nas pontas, cheia no meio */
.swash {
  width: 62%;
  height: 6px;
  margin: 0 0 1px 34%;
  overflow: visible;
  fill: var(--rose-ink);
  opacity: 0.85;
  transform-origin: left center;
  animation: swash-in 0.9s var(--ease) 0.5s backwards;
}
@media (hover: hover) {
  .brand:hover .swash {
    animation: swash-in 0.6s var(--ease);
  }
}
@keyframes swash-in {
  from {
    transform: scaleX(0);
  }
}
.tagline {
  font: 600 9.5px/1.2 var(--f-ui);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-3);
  white-space: nowrap;
}

/* ---------- atalhos ---------- */
.jump {
  position: relative;
  isolation: isolate;
  display: flex;
  gap: 2px;
  margin: 0 auto;
  padding: 4px;
  border-radius: var(--r-pill);
  background: color-mix(in srgb, var(--paper-3) 70%, transparent);
  box-shadow: inset 0 0 0 1px var(--line);
  overflow-x: auto;
  scrollbar-width: none;
}
.jump::-webkit-scrollbar {
  display: none;
}
.jump button {
  position: relative;
  z-index: 1;
  flex: none;
  min-height: calc(var(--h-sm) - 2px);
  padding: 0 13px;
  border: 0;
  border-radius: var(--r-pill);
  background: transparent;
  font: 700 11px/1 var(--f-ui);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
  cursor: pointer;
  transition:
    color var(--d2) var(--ease),
    background-color var(--d2) var(--ease);
}
.jump button:hover {
  color: var(--ink);
}
.jump button.on {
  color: var(--ink);
}
.jump button:focus-visible {
  border-radius: var(--r-pill);
}
/* o mesmo selo dos segmentos: papel, contorno de nanquim e fio interno */
.jump-pill {
  position: absolute;
  top: 4px;
  left: 0;
  z-index: 0;
  height: calc(var(--h-sm) - 2px);
  border-radius: var(--r-pill);
  background: var(--paper-2);
  box-shadow:
    0 0 0 var(--edge) var(--ink-stroke),
    inset 0 0 0 2px var(--paper-2),
    inset 0 0 0 3px var(--line-2),
    0 6px 14px -8px rgba(30, 28, 36, 0.45);
  pointer-events: none;
  opacity: 0;
  transition:
    transform 0.55s var(--spring),
    width 0.55s var(--spring),
    opacity var(--d2) var(--ease);
}
.jump-pill.ready {
  opacity: 1;
}

/* ---------- ações ---------- */
.actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  flex: none;
}
.sep {
  width: 1px;
  height: 20px;
  margin: 0 6px;
  background: var(--line-2);
}
.save-chip {
  margin-right: 4px;
}

/* o menu inteiro precisa caber: o subtítulo da marca só aparece com folga */
@media (max-width: 1399px) {
  .desk .tagline {
    display: none;
  }
  .jump button {
    padding: 0 9px;
    letter-spacing: 0.09em;
  }
  .island {
    gap: var(--s3);
    padding-left: 22px;
  }
}
/* desktop estreito: o menu tem prioridade; nova/imprimir/selo continuam no Resumo */
@media (max-width: 1199px) {
  .wide-only {
    display: none;
  }
  .jump button {
    padding: 0 8px;
    font-size: 10.5px;
    letter-spacing: 0.08em;
  }
}
@media (max-width: 991px) {
  .island {
    gap: var(--s2);
    padding-left: 20px;
  }
  .word {
    font-size: 16px;
  }
  .tagline {
    font-size: 9px;
    letter-spacing: 0.14em;
  }
}
@media (max-width: 359px) {
  .tagline {
    display: none;
  }
}
</style>
