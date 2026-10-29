<script setup lang="ts">
/* O cursor-etiqueta do Nomadic Tribe, adaptado para um app de trabalho: o
   cursor do sistema continua lá (precisão no mapa e no texto); a etiqueta
   só aparece junto dele sobre alvos com [data-cursor], dizendo o que o
   gesto faz ("Solte para converter", "Arraste para girar", "Segure").
   Pílula de papel com o selo da casa, ícone num círculo de tinta e texto
   folgado; perto da borda direita ela passa para o outro lado do cursor.
   Mouse e caneta. */
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useUiStore } from '@/stores/ui';
import Icon from './Icon.vue';

const ui = useUiStore();
const label = ref('');
const icon = ref('arrow-down');
const visible = ref(false);
const flip = ref(false);
const pos = ref({ x: -400, y: -400 });
const el = ref<HTMLElement | null>(null);
let target = { x: -400, y: -400 };
let raf = 0;
let running = false;

const GAP = 18;

function iconFor(text: string, explicit?: string): string {
  if (explicit) return explicit;
  if (/^solte/i.test(text)) return 'arrow-down';
  if (/girar/i.test(text)) return 'rot-cw';
  if (/mover/i.test(text)) return 'grip';
  if (/segure/i.test(text)) return 'clock';
  return 'arrow-right';
}

function aim(x: number, y: number) {
  const w = el.value?.offsetWidth ?? 180;
  flip.value = x + GAP + w > innerWidth - 12;
  target = { x: flip.value ? x - GAP - w : x + GAP, y: y + GAP };
}

function loop() {
  pos.value = {
    x: pos.value.x + (target.x - pos.value.x) * 0.24,
    y: pos.value.y + (target.y - pos.value.y) * 0.24,
  };
  if (Math.abs(target.x - pos.value.x) + Math.abs(target.y - pos.value.y) > 0.4) raf = requestAnimationFrame(loop);
  else running = false;
}
function run() {
  if (running) return;
  running = true;
  raf = requestAnimationFrame(loop);
}

function onMove(e: PointerEvent) {
  if (ui.still || e.pointerType === 'touch') {
    visible.value = false;
    return;
  }
  const host = (e.target as Element | null)?.closest?.('[data-cursor]') as HTMLElement | null;
  const text = host?.dataset.cursor ?? '';
  const was = visible.value;
  visible.value = !!text;
  if (text) {
    label.value = text;
    icon.value = iconFor(text, host?.dataset.cursorIcon);
  }
  aim(e.clientX, e.clientY);
  // ao aparecer, nasce já no lugar (sem atravessar a tela)
  if (!was || !visible.value) {
    pos.value = { ...target };
    return;
  }
  run();
}

function onDrag(e: DragEvent) {
  if (!ui.dragging || ui.still) return;
  label.value = 'Solte num destino';
  icon.value = 'arrow-down';
  if (!visible.value) {
    aim(e.clientX, e.clientY);
    pos.value = { ...target };
  }
  visible.value = true;
  aim(e.clientX, e.clientY);
  run();
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
  <div
    ref="el"
    class="companion"
    :class="{ on: visible, flip }"
    :style="{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }"
    aria-hidden="true"
  >
    <span class="pill">
      <span class="dot"><Icon :name="icon" size="sm" /></span>
      <span class="text">{{ label }}</span>
    </span>
  </div>
</template>

<style scoped>
.companion {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 9000;
  pointer-events: none;
  will-change: transform;
}
.pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 38px;
  padding: 0 18px 0 5px;
  border-radius: var(--r-pill);
  border: var(--edge) solid var(--ink-stroke);
  background: color-mix(in srgb, var(--paper-2) 94%, transparent);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow-pop);
  color: var(--ink);
  white-space: nowrap;
  opacity: 0;
  transform: scale(0.7) translateY(4px);
  transform-origin: 0 0;
  transition:
    opacity var(--d2) var(--ease),
    transform var(--d3) var(--spring);
}
/* o fio interno gravado, o mesmo dos botões */
.pill::after {
  content: '';
  position: absolute;
  inset: 2.5px;
  border-radius: inherit;
  border: 1px solid var(--line-2);
}
.flip .pill {
  transform-origin: 100% 0;
}
.on .pill {
  opacity: 1;
  transform: none;
}
.dot {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  flex: none;
  border-radius: 50%;
  background: var(--rose-ink);
  color: var(--paper-2);
}
.on .dot .i-arrow-down {
  animation: ink-nudge-d 1.1s var(--ease-in-out) infinite;
}
.on .dot .i-rot-cw {
  animation: ink-cw 1.6s var(--ease-in-out) infinite;
}
.text {
  position: relative;
  font: 600 12.5px/1 var(--f-ui);
  letter-spacing: 0.01em;
}
@media (pointer: coarse) {
  .companion {
    display: none;
  }
}
</style>
