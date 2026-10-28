<script setup lang="ts">
/* Desenho técnico (funciona offline): roda com Ctrl para zoom, arraste
   para mover e pinça no toque — Pointer Events para mouse, toque e caneta. */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { paintPolygon } from '@/features/terrain/paint';
import { useMatriculaStore } from '@/stores/matricula';
import { useTerrainStore } from '@/stores/terrain';
import { useUiStore } from '@/stores/ui';

const mat = useMatriculaStore();
const terrain = useTerrainStore();
const ui = useUiStore();
const cv = ref<HTMLCanvasElement | null>(null);
const view = { zoom: 1, ox: 0, oy: 0 };
let ro: ResizeObserver | null = null;
let raf = 0;

const css = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

function paint() {
  const c = cv.value;
  if (!c) return;
  const r = c.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  c.width = Math.round(r.width * dpr);
  c.height = Math.round(r.height * dpr);
  const ctx = c.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  paintPolygon(ctx, r.width, r.height, mat.points, mat.geo.kind, {
    ...view,
    labels: mat.geo.labels,
    segments: mat.data?.dados_geoespaciais,
    measures: terrain.measures,
    colors: { ink: css('--ink') || '#1e1c24', soft: css('--ink-3') || '#66637a', accent: css('--rose-ink') || '#974a40', fill: 'rgba(151,74,64,.16)' },
  });
}

function schedule() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(paint);
}

/* gestos */
const pointers = new Map<number, { x: number; y: number }>();
let last = { x: 0, y: 0 };
let pinch = { dist: 0, zoom: 1 };

function onWheel(e: WheelEvent) {
  if (!e.ctrlKey && ui.focusPanel !== 'terreno' && ui.isDesktop) {
    terrain.showHint('Use Ctrl + roda do mouse para dar zoom — ou abra em tela cheia', 2600, 'wheel');
    return;
  }
  e.preventDefault();
  const r = cv.value!.getBoundingClientRect();
  const px = e.clientX - r.left;
  const py = e.clientY - r.top;
  const nz = Math.min(40, Math.max(0.2, view.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
  const k = nz / view.zoom;
  view.ox = px - k * (px - view.ox);
  view.oy = py - k * (py - view.oy);
  view.zoom = nz;
  schedule();
}
function onDown(e: PointerEvent) {
  cv.value!.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  last = { x: e.clientX, y: e.clientY };
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinch = { dist: Math.hypot(a!.x - b!.x, a!.y - b!.y), zoom: view.zoom };
  }
}
function onMove(e: PointerEvent) {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
    if (pinch.dist > 0) view.zoom = Math.min(40, Math.max(0.2, (pinch.zoom * d) / pinch.dist));
  } else {
    view.ox += e.clientX - last.x;
    view.oy += e.clientY - last.y;
    last = { x: e.clientX, y: e.clientY };
  }
  schedule();
}
function onUp(e: PointerEvent) {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinch.dist = 0;
}
function resetView() {
  view.zoom = 1;
  view.ox = 0;
  view.oy = 0;
  schedule();
}

watch(() => [mat.revision, terrain.measures, ui.dark] as const, schedule);
watch(() => mat.loadedAt, resetView);
onMounted(() => {
  ro = new ResizeObserver(schedule);
  if (cv.value) ro.observe(cv.value);
  schedule();
});
onBeforeUnmount(() => {
  ro?.disconnect();
  cancelAnimationFrame(raf);
});
defineExpose({ resetView });
</script>

<template>
  <canvas
    ref="cv"
    class="geo-canvas"
    data-cursor="Arraste para mover"
    role="img"
    :aria-label="mat.summary ? `Desenho do terreno com ${mat.summary.vertices} vértices` : 'Desenho do terreno'"
    @wheel="onWheel"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointercancel="onUp"
    @dblclick="resetView"
  />
</template>

<style scoped>
.geo-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: grab;
  background: var(--paper-2);
}
.geo-canvas:active {
  cursor: grabbing;
}
</style>
