<script setup lang="ts">
/* Bloco do painel — a "carta" do tríptico: moldura de nanquim, cantos
   ornamentais em hachura, pictograma, número da seção e ferramentas.
   Pode abrir em tela cheia (modo foco) sem sair da página. */
import { computed } from 'vue';
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
  }>(),
  { sub: '', accent: 'slate', expandable: false, flush: false },
);

const ui = useUiStore();
const focused = computed(() => ui.focusPanel === props.id);
const num = computed(() => String(props.index).padStart(2, '0'));

function toggleFocus() {
  ui.focusPanel = focused.value ? null : props.id;
}
</script>

<template>
  <section
    :id="`painel-${id}`"
    class="tile"
    :class="[`accent-${accent}`, { 'is-focus': focused, flush }]"
    :aria-labelledby="`titulo-${id}`"
    :data-panel="id"
  >
    <InkFrame :seed="id" :radius="14" :draw="!ui.still" />
    <svg class="corner corner-l" viewBox="0 0 40 40" aria-hidden="true"><path d="M1 39V1h38A38 38 0 0 0 1 39z" /><path class="rays" d="M1 1l8 30M1 1l16 22M1 1l24 15M1 1l31 7" /></svg>
    <svg class="corner corner-r" viewBox="0 0 40 40" aria-hidden="true"><path d="M39 39V1H1a38 38 0 0 1 38 38z" /><path class="rays" d="M39 1l-8 30M39 1L23 23M39 1L15 16M39 1L8 8" /></svg>

    <header class="tile-head">
      <span class="tile-picto"><Picto :name="picto" :size="30" /></span>
      <div class="tile-titles">
        <h2 :id="`titulo-${id}`"><span class="tile-num">{{ num }}</span>{{ title }}</h2>
        <p v-if="sub" class="tile-sub">{{ sub }}</p>
      </div>
      <div class="tile-tools">
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
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background-color: var(--paper-2);
  background-image: var(--grain);
  border-radius: 14px;
  box-shadow: var(--shadow-lift);
  isolation: isolate;
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
  width: 26px;
  height: 26px;
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
  opacity: 0.7;
}
.corner-l {
  left: 0;
  border-top-left-radius: 14px;
}
.corner-r {
  right: 0;
  border-top-right-radius: 14px;
}

.tile-head {
  position: relative;
  z-index: 4;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s2) var(--s3);
  padding: var(--s4) var(--tile-pad) var(--s3) calc(var(--tile-pad) + 10px);
  min-height: 64px;
}
.tile-picto {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex: none;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
}
/* o título pede ~150 px; se as ferramentas não couberem ao lado,
   elas descem para a linha de baixo em vez de cobrir o título */
.tile-titles {
  min-width: min(150px, 100%);
  flex: 1 1 150px;
}
.tile-head h2 {
  display: flex;
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
  margin-top: 3px;
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

.tile-body {
  position: relative;
  z-index: 1;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: var(--s3);
  padding: 0 var(--tile-pad) var(--tile-pad);
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

/* modo foco: o bloco ocupa a tela, o resto fica sob um véu */
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
    border-radius: 12px;
  }
  .tile-head {
    min-height: 56px;
    padding-top: var(--s3);
  }
}
</style>
