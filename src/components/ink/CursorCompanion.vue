<script setup lang="ts">
/* O cursor oval do Nomadic Tribe, adaptado para um app de trabalho: o
   cursor do sistema continua lá (precisão no mapa e no texto); a bolha
   só aparece junto dele sobre alvos com [data-cursor], dizendo o que o
   gesto faz ("Solte", "Arraste para girar", "Segure"). Mouse e caneta. */
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useUiStore } from '@/stores/ui';

const ui = useUiStore();
const label = ref('');
const visible = ref(false);
const pos = ref({ x: -200, y: -200 });
let target = { x: -200, y: -200 };
let raf = 0;
let running = false;

function loop() {
  pos.value = {
    x: pos.value.x + (target.x - pos.value.x) * 0.22,
    y: pos.value.y + (target.y - pos.value.y) * 0.22,
  };
  if (Math.abs(target.x - pos.value.x) + Math.abs(target.y - pos.value.y) > 0.4) raf = requestAnimationFrame(loop);
  else running = false;
}

function onMove(e: PointerEvent) {
  if (ui.still || e.pointerType === 'touch') {
    visible.value = false;
    return;
  }
  const el = (e.target as Element | null)?.closest?.('[data-cursor]') as HTMLElement | null;
  const text = el?.dataset.cursor ?? '';
  visible.value = !!text;
  if (text) label.value = text;
  target = { x: e.clientX + 18, y: e.clientY + 20 };
  if (!visible.value) {
    pos.value = { ...target };
    return;
  }
  if (!running) {
    running = true;
    raf = requestAnimationFrame(loop);
  }
}

function onDrag(e: DragEvent) {
  if (!ui.dragging || ui.still) return;
  label.value = 'Solte num destino';
  visible.value = true;
  target = { x: e.clientX + 18, y: e.clientY + 20 };
  if (!running) {
    running = true;
    raf = requestAnimationFrame(loop);
  }
}

function hide() {
  visible.value = false;
}

onMounted(() => {
  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('dragover', onDrag, { passive: true });
  addEventListener('blur', hide);
  document.addEventListener('pointerleave', hide);
});
onBeforeUnmount(() => {
  removeEventListener('pointermove', onMove);
  removeEventListener('dragover', onDrag);
  removeEventListener('blur', hide);
  document.removeEventListener('pointerleave', hide);
  cancelAnimationFrame(raf);
});
</script>

<template>
  <div class="companion" :class="{ on: visible }" :style="{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }" aria-hidden="true">
    <svg viewBox="0 0 120 52" preserveAspectRatio="none"><path d="M8 27C6 12 30 4 60 5s53 7 52 22-24 21-53 20S10 41 8 27z" /></svg>
    <span>{{ label }}</span>
  </div>
</template>

<style scoped>
.companion {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 9000;
  pointer-events: none;
  display: grid;
  place-items: center;
  min-width: 96px;
  height: 40px;
  padding: 0 18px;
  opacity: 0;
  scale: 0.6;
  transition:
    opacity var(--d2) var(--ease),
    scale var(--d2) var(--spring);
  will-change: transform;
}
.companion.on {
  opacity: 1;
  scale: 1;
}
.companion svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.companion path {
  fill: var(--paper-2);
  stroke: var(--ink-stroke);
  stroke-width: 1.6;
  vector-effect: non-scaling-stroke;
}
.companion span {
  position: relative;
  font: 700 10.5px/1 var(--f-ui);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink);
  white-space: nowrap;
}
@media (pointer: coarse) {
  .companion {
    display: none;
  }
}
</style>
