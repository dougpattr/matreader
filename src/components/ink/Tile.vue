<script setup lang="ts">
/* Bloco do painel — a "carta" do tríptico: moldura de nanquim viva (ferve
   e solta uma faísca no hover), cantos ornamentais em hachura, pictograma
   que respira, número da seção e ferramentas. Pode abrir em tela cheia
   (modo foco) sem sair da página.
   Chegada: quando o usuário pula para o bloco (menu, atalho 1–8), a
   navegação dispara o evento "arrive" depois que a rolagem assenta; o
   bloco responde com a moldura na sua cor, um halo, o pictograma saltando
   e um círculo de caneta em volta do título — "é aqui".
   hero: a cabeça vira uma etiqueta de vidro sobre o conteúdo (Entrada,
   onde a paisagem ocupa o bloco inteiro). */
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';
import { useUiStore, type PanelId } from '@/stores/ui';
import Icon from './Icon.vue';
import InkFrame from './InkFrame.vue';
import Picto from './Picto.vue';

const props = withDefaults(
  defineProps<{
    id: PanelId;
    index: number;
    title: string;
    sub?: string;
    picto: string;
    accent?: 'slate' | 'rose' | 'sage' | 'mustard' | 'sky';
    expandable?: boolean;
    flush?: boolean;
    hero?: boolean;
  }>(),
  { sub: '', accent: 'slate', expandable: false, flush: false, hero: false },
);

const ui = useUiStore();
const focused = computed(() => ui.focusPanel === props.id);
const num = computed(() => String(props.index).padStart(2, '0'));

function toggleFocus() {
  ui.focusPanel = focused.value ? null : props.id;
}

const arriving = ref(false);
let arriveTimer = 0;
async function onArrive() {
  // tira e repõe a classe para a animação recomeçar a cada chegada
  arriving.value = false;
  await nextTick();
  arriving.value = true;
  clearTimeout(arriveTimer);
  arriveTimer = window.setTimeout(() => (arriving.value = false), 2100);
}
onBeforeUnmount(() => clearTimeout(arriveTimer));
</script>

<template>
  <section
    :id="`painel-${id}`"
    class="tile live-frame"
    :class="[`accent-${accent}`, { 'is-focus': focused, flush, hero, arriving }]"
    :aria-labelledby="`titulo-${id}`"
    :data-panel="id"
    @arrive="onArrive"
  >
    <InkFrame :seed="id" :radius="18" :draw="!ui.still" live />
    <template v-if="!hero">
      <svg class="corner corner-l" viewBox="0 0 40 40" aria-hidden="true"><path d="M1 39V1h38A38 38 0 0 0 1 39z" /><path class="rays" pathLength="1" d="M1 1l8 30M1 1l16 22M1 1l24 15M1 1l31 7" /></svg>
      <svg class="corner corner-r" viewBox="0 0 40 40" aria-hidden="true"><path d="M39 39V1H1a38 38 0 0 1 38 38z" /><path class="rays" pathLength="1" d="M39 1l-8 30M39 1L23 23M39 1L15 16M39 1L8 8" /></svg>
    </template>

    <header class="tile-head">
      <span class="tile-label">
        <span class="tile-picto"><Picto :name="picto" :size="30" /></span>
        <span class="tile-titles">
          <h2 :id="`titulo-${id}`">
            <span class="tile-num">{{ num }}</span>{{ title }}
            <svg class="pen-ring" viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M30 36C14 25 38 9 98 8s98 7 96 22-42 23-98 23S4 46 9 30c3-10 20-17 44-20" /></svg>
          </h2>
          <span v-if="sub" class="tile-sub">{{ sub }}</span>
        </span>
      </span>
      <div v-if="$slots.tools || (expandable && ui.isDesktop)" class="tile-tools">
        <slot name="tools" />
        <button
          v-if="expandable && ui.isDesktop"
          type="button"
          class="ink-round sm ghost"
          :aria-label="focused ? 'Sair da tela cheia' : 'Abrir em tela cheia'"
          :title="focused ? 'Sair da tela cheia (Esc)' : 'Tela cheia'"
          @click="toggleFocus"
        >
          <Icon :name="focused ? 'collapse' : 'expand'" size="sm" />
        </button>
      </div>
    </header>

    <div class="tile-body scroll">
      <slot />
    </div>
    <footer v-if="$slots.foot" class="tile-foot">
      <slot name="foot" />
    </footer>
  </section>
</template>

<style scoped>
.tile {
  --accent: var(--slate);
  --accent-soft: var(--slate-soft);
  --tile-r: var(--r-card);
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background-color: var(--paper-2);
  background-image: var(--grain);
  border-radius: var(--tile-r);
  box-shadow: var(--shadow-lift);
  isolation: isolate;
  scroll-margin-top: calc(var(--float-top) + 6px);
  animation: tile-in var(--d3) var(--ease) backwards;
  animation-delay: calc(var(--i, 0) * 70ms);
}
.accent-rose {
  --accent: var(--rose-ink);
  --accent-soft: var(--rose-soft);
}
.accent-sage {
  --accent: var(--teal);
  --accent-soft: var(--teal-soft);
}
.accent-mustard {
  --accent: var(--mustard-ink);
  --accent-soft: var(--mustard-soft);
}
.accent-sky {
  --accent: var(--slate-2);
  --accent-soft: var(--sky-soft);
}
@keyframes tile-in {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* cantos ornamentais (hachura em leque, como as peças do tríptico) */
.corner {
  position: absolute;
  top: 0;
  width: 28px;
  height: 28px;
  z-index: 2;
  pointer-events: none;
  fill: var(--accent-soft);
  stroke: var(--accent);
  stroke-width: 1;
  opacity: 0.9;
}
.corner .rays {
  fill: none;
  stroke-width: 0.8;
  stroke-dasharray: 1;
  opacity: 0.7;
}
@media (hover: hover) {
  .tile:hover .corner .rays {
    animation: rays-draw 0.9s var(--ease);
  }
}
@keyframes rays-draw {
  from {
    stroke-dashoffset: 1;
  }
}
.corner-l {
  left: 0;
  border-top-left-radius: var(--tile-r);
}
.corner-r {
  right: 0;
  border-top-right-radius: var(--tile-r);
}

/* ---------- cabeça ---------- */
.tile-head {
  position: relative;
  z-index: 4;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s2) var(--s3);
  padding: 18px var(--tile-pad) 14px calc(var(--tile-pad) + 8px);
  min-height: 68px;
}
/* nos blocos comuns a etiqueta não existe para o layout (display: contents);
   no hero ela vira a pílula de vidro */
.tile-label {
  display: contents;
}
.tile-picto {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  flex: none;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
}
/* o título pede ~150 px; se as ferramentas não couberem ao lado,
   elas descem para a linha de baixo em vez de cobrir o título */
.tile-titles {
  display: grid;
  justify-items: start;
  min-width: min(150px, 100%);
  flex: 1 1 150px;
}
.tile-head h2 {
  position: relative;
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  font: 700 13px/1.2 var(--f-ui);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink);
}
.tile-num {
  font: 700 11px/1 var(--f-display);
  letter-spacing: 0.04em;
  color: var(--accent);
}
.tile-sub {
  max-width: 100%;
  margin-top: 4px;
  font-size: 12px;
  color: var(--ink-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tile-tools {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: none;
  margin-left: auto;
}

/* ---------- corpo ---------- */
.tile-body {
  position: relative;
  z-index: 1;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: var(--s4);
  padding: 2px var(--tile-pad) var(--tile-pad);
  overflow: auto;
}
.flush .tile-body {
  padding: 0;
}
.tile-foot {
  position: relative;
  z-index: 4;
  display: flex;
  align-items: center;
  gap: var(--s2);
  flex-wrap: wrap;
  padding: var(--s3) var(--tile-pad);
  border-top: 1px dashed var(--line-2);
}

/* ---------- hero: etiqueta de vidro sobre a paisagem ---------- */
.hero .tile-head {
  position: absolute;
  inset: 0 0 auto;
  min-height: 0;
  padding: 14px;
  pointer-events: none;
}
.hero .tile-label {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  max-width: 100%;
  padding: 5px 18px 5px 5px;
  border-radius: var(--r-pill);
  background: var(--glass);
  -webkit-backdrop-filter: blur(12px) saturate(1.2);
  backdrop-filter: blur(12px) saturate(1.2);
  box-shadow:
    0 0 0 var(--edge) var(--ink-stroke),
    var(--shadow-lift);
  pointer-events: auto;
}
.hero .tile-picto {
  width: 38px;
  height: 38px;
}
.hero .tile-titles {
  flex: 0 1 auto;
  min-width: 0;
}
.hero .tile-body {
  padding: 0;
  gap: 0;
  overflow: visible;
}

/* ---------- chegada ---------- */
.tile::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  pointer-events: none;
}
.tile.arriving::after {
  animation: halo 0.95s var(--ease) 2;
}
@keyframes halo {
  from {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 50%, transparent);
  }
  to {
    box-shadow: 0 0 0 18px color-mix(in srgb, var(--accent) 0%, transparent);
  }
}
.arriving .tile-picto {
  animation: picto-hop 0.8s var(--spring);
}
@keyframes picto-hop {
  30% {
    transform: translateY(-6px) scale(1.12) rotate(-8deg);
  }
  60% {
    transform: translateY(1px) scale(0.97) rotate(3deg);
  }
}
/* o círculo de caneta em volta do título */
.pen-ring {
  position: absolute;
  left: -16px;
  top: -12px;
  width: calc(100% + 34px);
  height: calc(100% + 24px);
  overflow: visible;
  fill: none;
  stroke: var(--accent);
  stroke-width: 2.2;
  stroke-linecap: round;
  pointer-events: none;
  opacity: 0;
}
.pen-ring path {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
}
.arriving .pen-ring {
  animation: ring-fade 2s var(--ease) forwards;
}
.arriving .pen-ring path {
  animation: ring-draw 0.75s var(--ease) 0.12s forwards;
}
@keyframes ring-fade {
  0%,
  72% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}
@keyframes ring-draw {
  to {
    stroke-dashoffset: 0;
  }
}
/* sem movimento: só a moldura muda de cor (motion.css), e o círculo aparece inteiro */
:root.still .arriving .pen-ring {
  animation: none;
  opacity: 1;
}
:root.still .arriving .pen-ring path {
  animation: none;
  stroke-dashoffset: 0;
}

/* ---------- modo foco: o bloco ocupa a tela, o resto fica sob um véu ---------- */
.tile.is-focus {
  position: fixed;
  inset: 12px;
  z-index: 60;
  animation: focus-in var(--d3) var(--spring);
  box-shadow: var(--shadow-pop);
}
.tile.is-focus .tile-body {
  max-height: none !important;
}
@keyframes focus-in {
  from {
    transform: scale(0.97);
    opacity: 0.6;
  }
  to {
    transform: none;
    opacity: 1;
  }
}

@media (max-width: 991px) {
  .tile {
    --tile-r: 16px;
  }
  .tile-head {
    min-height: 60px;
    padding-top: 14px;
  }
}
</style>
