<script setup lang="ts">
/* "Segure para confirmar" — a interação de segurar do Nomadic Tribe com
   função: protege ações sem volta (apagar). Um anel de tinta enche
   enquanto o dedo/botão/tecla fica pressionado. Funciona com mouse,
   toque, caneta e teclado (Espaço ou Enter). */
import { onBeforeUnmount, ref } from 'vue';
import Icon from './Icon.vue';

const props = withDefaults(defineProps<{ label: string; icon?: string; ms?: number; danger?: boolean; compact?: boolean }>(), {
  icon: 'trash',
  ms: 900,
  danger: true,
  compact: false,
});
const emit = defineEmits<{ confirm: [] }>();

const progress = ref(0);
const holding = ref(false);
let raf = 0;
let start = 0;

function step(t: number) {
  if (!holding.value) return;
  progress.value = Math.min(1, (t - start) / props.ms);
  if (progress.value >= 1) {
    holding.value = false;
    progress.value = 0;
    emit('confirm');
    return;
  }
  raf = requestAnimationFrame(step);
}

function begin() {
  if (holding.value) return;
  holding.value = true;
  start = performance.now();
  raf = requestAnimationFrame(step);
}

function cancel() {
  holding.value = false;
  cancelAnimationFrame(raf);
  progress.value = 0;
}

function onKey(e: KeyboardEvent, down: boolean) {
  if (e.key !== ' ' && e.key !== 'Enter') return;
  e.preventDefault();
  if (down && !e.repeat) begin();
  else if (!down) cancel();
}

onBeforeUnmount(cancel);
const C = 2 * Math.PI * 15;
</script>

<template>
  <button
    type="button"
    class="hold"
    :class="{ 'is-holding': holding, danger, compact }"
    :aria-label="`${label} — segure para confirmar`"
    :title="`${label} (segure)`"
    data-cursor="Segure"
    @pointerdown.prevent="begin"
    @pointerup="cancel"
    @pointerleave="cancel"
    @pointercancel="cancel"
    @keydown="onKey($event, true)"
    @keyup="onKey($event, false)"
    @contextmenu.prevent
  >
    <span class="hold-ring" aria-hidden="true">
      <svg viewBox="0 0 36 36">
        <circle class="track" cx="18" cy="18" r="15" />
        <circle class="fill" cx="18" cy="18" r="15" :stroke-dasharray="C" :stroke-dashoffset="C * (1 - progress)" />
      </svg>
      <Icon :name="icon" size="sm" />
    </span>
    <span v-if="!compact" class="hold-label">{{ label }}</span>
  </button>
</template>

<style scoped>
/* mesma família dos botões (pílula, contorno, altura sm); o anel de tinta
   à esquerda enche enquanto o botão é segurado */
.hold {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: var(--h-sm);
  padding: 0 16px 0 4px;
  border-radius: var(--r-pill);
  border: var(--edge) solid var(--ink-stroke);
  background: var(--paper-2);
  color: var(--ink-2);
  font: 600 12.5px/1 var(--f-ui);
  cursor: pointer;
  user-select: none;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color var(--d2) var(--ease),
    color var(--d1) var(--ease),
    transform var(--d1) var(--ease);
}
.hold.danger {
  border-color: var(--bad);
  color: var(--bad);
}
.hold:hover {
  background: var(--paper-3);
}
.hold.danger:hover,
.hold.is-holding {
  background: var(--bad-soft);
}
.hold.is-holding {
  transform: scale(0.98);
}
.hold:focus-visible {
  outline: 2px solid var(--slate-2);
  outline-offset: 3px;
  border-radius: var(--r-pill);
}
.hold.compact {
  justify-content: center;
  width: var(--h-sm);
  padding: 0;
  border-color: transparent;
  background: transparent;
}
.hold.compact:hover,
.hold.compact.is-holding {
  background: var(--bad-soft);
}
.hold-ring {
  position: relative;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
}
.hold-ring svg {
  position: absolute;
  inset: 0;
  transform: rotate(-90deg);
}
.track {
  fill: none;
  stroke: color-mix(in srgb, currentColor 25%, transparent);
  stroke-width: 2;
}
.fill {
  fill: none;
  stroke: currentColor;
  stroke-width: 2.8;
  stroke-linecap: round;
}
.hold-ring .ink-icon {
  width: 14px;
  height: 14px;
}
.is-holding .hold-ring {
  transform: scale(1.08);
}
</style>
