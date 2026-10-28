<script setup lang="ts">
/* A janela em arco do tríptico: paisagem em tons pastel com o terreno
   demarcado por estacas. Reage ao que acontece — arraste (o contorno
   pulsa e a seta aponta), conversão (o pássaro mensageiro atravessa o
   céu), pronto (o lote ganha cor) e erro (o céu escurece). */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useUiStore } from '@/stores/ui';

const props = withDefaults(defineProps<{ state?: 'idle' | 'over' | 'busy' | 'done' | 'error' }>(), { state: 'idle' });
const ui = useUiStore();
const host = ref<HTMLElement | null>(null);
const px = ref(0);
const py = ref(0);

function onMove(e: PointerEvent) {
  if (ui.still || e.pointerType !== 'mouse' || !host.value) return;
  const r = host.value.getBoundingClientRect();
  px.value = ((e.clientX - r.left) / r.width - 0.5) * 2;
  py.value = ((e.clientY - r.top) / r.height - 0.5) * 2;
}
function onLeave() {
  px.value = 0;
  py.value = 0;
}
const layer = (depth: number) => computed(() => `translate(${(px.value * depth).toFixed(2)} ${(py.value * depth * 0.5).toFixed(2)})`);
const far = layer(-2);
const mid = layer(-4);
const near = layer(-8);

onMounted(() => host.value?.addEventListener('pointermove', onMove));
onBeforeUnmount(() => host.value?.removeEventListener('pointermove', onMove));
</script>

<template>
  <div ref="host" class="arch" :class="`is-${props.state}`" @pointerleave="onLeave">
    <svg class="arch-art" viewBox="0 0 400 290" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="arch-clip"><path d="M2 290V122A198 120 0 0 1 398 122V290Z" /></clipPath>
        <linearGradient id="arch-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" class="sky-a" />
          <stop offset=".62" class="sky-b" />
        </linearGradient>
        <pattern id="arch-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
          <path d="M0 3h6" class="hatch-line" />
        </pattern>
      </defs>
      <g clip-path="url(#arch-clip)">
        <rect width="400" height="290" fill="url(#arch-sky)" />
        <g :transform="far">
          <circle class="sun" cx="292" cy="92" r="24" />
          <path class="cloud" d="M60 104c-2-10 10-16 18-11 3-11 22-12 26 0 9-4 19 3 15 12 7 2 6 12-2 12H62c-9 0-10-11-2-13z" />
          <path class="cloud" d="M232 62c-1-7 7-11 13-7 3-8 16-8 18 0 7-2 13 2 11 9 5 2 4 9-2 9h-38c-7 0-8-9-2-11z" />
          <path class="mount-far" d="M-4 176 56 128l34 26 56-52 54 50 46-32 60 44 52-30 46 30v40H-4z" />
          <path class="snow" d="M146 102l14 13-9-2-6 6-7-6-8 3zM302 136l11 9-7-1-4 4-5-4-6 2z" />
        </g>
        <g :transform="mid">
          <path class="hill" d="M-4 196c62-30 126-14 196-24s140-26 212-6v60H-4z" />
          <path class="river" d="M338 296c-30-20 6-38-14-56s4-30-10-44" />
          <path class="field" d="M-4 222c86-20 192-10 276-18 50-5 96-12 132-4v94H-4z" />
          <g class="furrows">
            <path d="M18 254c60-8 120-10 182-8M40 272c70-8 140-10 210-8M90 238c40-4 80-6 120-5" />
          </g>
          <g class="lot">
            <path class="lot-fill" d="M118 238 206 216l86 12-28 30-112 4z" />
            <path class="lot-line" d="M118 238 206 216l86 12-28 30-112 4z" />
            <g class="stakes">
              <path d="M118 238v-14l7 3-7 3M206 216v-14l7 3-7 3M292 228v-14l7 3-7 3M264 258v-14l7 3-7 3M152 262v-14l7 3-7 3" />
            </g>
            <circle class="v0" cx="118" cy="238" r="3.4" />
            <circle cx="206" cy="216" r="2.6" />
            <circle cx="292" cy="228" r="2.6" />
            <circle cx="264" cy="258" r="2.6" />
            <circle cx="152" cy="262" r="2.6" />
          </g>
        </g>
        <g :transform="near">
          <g class="fern">
            <path d="M8 292c6-30 18-52 40-70M20 268c-8-4-14-4-20 0M28 252c-8-5-15-6-22-2M38 238c-6-6-13-8-20-6M24 262c6-6 13-8 20-7M33 246c6-6 12-9 19-9" />
          </g>
          <g class="leaves">
            <path d="M352 292c-6-24 2-44 22-58 4 22-4 42-22 58z" />
            <path d="M372 294c4-18 14-30 30-36-2 18-12 30-30 36z" />
            <path d="M352 292c4-16 10-30 22-58M372 294c8-12 16-24 30-36" class="vein" />
          </g>
          <g class="mush">
            <path class="cap" d="M318 270c0-10 8-16 16-16s16 6 16 16z" />
            <path class="stem" d="M330 270v14h8v-14" />
            <path class="cap" d="M296 280c0-7 5-11 11-11s11 4 11 11z" />
            <path class="stem" d="M304 280v10h6v-10" />
          </g>
        </g>
        <g class="bird">
          <path d="M0 6c4-3 8-3 12 0 3-6 8-9 15-10-4 3-7 7-8 11 3 0 6 1 8 3-7 0-14 1-20 1-3 0-5-2-7-5z" />
        </g>
      </g>
      <path class="arch-edge" d="M2 290V122A198 120 0 0 1 398 122V290" />
      <path class="arch-edge thin" d="M8 290V124A192 114 0 0 1 392 124V290" />
    </svg>
    <div class="arch-overlay">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.arch {
  position: relative;
  border-radius: var(--r-md);
  overflow: hidden;
  isolation: isolate;
  aspect-ratio: 400 / 290;
  min-height: 220px;
  max-height: 340px;
  width: 100%;
}
.arch-art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.arch-art g {
  transition: transform 0.6s var(--ease);
}
.sky-a {
  stop-color: #f2c8bc;
}
.sky-b {
  stop-color: #f8ece2;
}
:root.theme-noite .sky-a {
  stop-color: #3a3557;
}
:root.theme-noite .sky-b {
  stop-color: #5d5878;
}
.is-error .sky-a {
  stop-color: #c98d84;
}
.sun {
  fill: #f8dcc6;
  stroke: var(--ink-stroke);
  stroke-width: 1;
  opacity: 0.9;
}
:root.theme-noite .sun {
  fill: #e8e1cf;
}
.cloud {
  fill: #fbf5ee;
  stroke: var(--ink-stroke);
  stroke-width: 1.1;
}
.mount-far {
  fill: #aab2c9;
  stroke: var(--ink-stroke);
  stroke-width: 1.1;
}
.snow {
  fill: #f4efe8;
  stroke: var(--ink-stroke);
  stroke-width: 0.8;
}
.hill {
  fill: #b5ccc3;
  stroke: var(--ink-stroke);
  stroke-width: 1.1;
}
.river {
  stroke: #8ba7c5;
  stroke-width: 9;
  opacity: 0.85;
}
.field {
  fill: #e7d9a9;
  stroke: var(--ink-stroke);
  stroke-width: 1.1;
}
:root.theme-noite .mount-far {
  fill: #6f7697;
}
:root.theme-noite .hill {
  fill: #5f7d78;
}
:root.theme-noite .field {
  fill: #8d8462;
}
.furrows path {
  stroke: rgba(30, 28, 36, 0.28);
  stroke-width: 0.9;
  stroke-dasharray: 3 5;
}
.lot-fill {
  fill: url(#arch-hatch);
  transition: fill 0.6s var(--ease);
}
.hatch-line {
  stroke: #974a40;
  stroke-width: 1;
  opacity: 0.55;
}
.lot-line {
  stroke: #24222b;
  stroke-width: 1.6;
  stroke-dasharray: 5 4;
}
.stakes path {
  stroke: #24222b;
  stroke-width: 1.1;
}
.lot circle {
  fill: #fbf7f1;
  stroke: #24222b;
  stroke-width: 1.1;
}
.lot circle.v0 {
  fill: #974a40;
}
.fern path {
  stroke: #3f7470;
  stroke-width: 1.6;
}
.leaves path {
  fill: #9cb8b3;
  stroke: #24222b;
  stroke-width: 1.1;
}
.leaves .vein {
  fill: none;
  stroke-width: 0.8;
}
.cap {
  fill: #e5c35b;
  stroke: #24222b;
  stroke-width: 1.1;
}
.stem {
  fill: #fbf4ea;
  stroke: #24222b;
  stroke-width: 1.1;
}
.bird {
  opacity: 0;
}
.bird path {
  fill: #fbf7f1;
  stroke: #24222b;
  stroke-width: 1.1;
}
.arch-edge {
  stroke: var(--ink-stroke);
  stroke-width: 2.2;
}
.arch-edge.thin {
  stroke-width: 0.9;
  opacity: 0.55;
}

/* estados */
.is-over .lot-line {
  stroke: #974a40;
  stroke-width: 2.2;
  animation: lot-march 0.9s linear infinite;
}
.is-over .lot-fill {
  animation: lot-breathe 1.2s var(--ease-in-out) infinite alternate;
}
.is-done .lot-fill {
  fill: rgba(63, 116, 112, 0.35);
}
.is-done .lot-line {
  stroke-dasharray: none;
}
.is-busy .bird {
  opacity: 1;
  animation: bird-fly 4.2s var(--ease-in-out) infinite;
}
@keyframes lot-march {
  to {
    stroke-dashoffset: -18;
  }
}
@keyframes lot-breathe {
  from {
    opacity: 0.55;
  }
  to {
    opacity: 1;
  }
}
@keyframes bird-fly {
  0% {
    transform: translate(-30px, 70px) scale(0.9);
  }
  50% {
    transform: translate(200px, 46px) scale(1.05);
  }
  100% {
    transform: translate(430px, 64px) scale(0.9);
  }
}

.arch-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  padding: var(--s4);
  z-index: 2;
}
</style>
