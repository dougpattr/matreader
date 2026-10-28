<script setup lang="ts">
/* A jornada da matrícula, desenhada como a trilha da tribo: estações
   ligadas por um caminho de nanquim e um viajante que avança com o
   progresso real da conversão. */
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import Icon from './Icon.vue';

const props = defineProps<{
  stages: { id: string; label: string; short?: string; hint: string }[];
  current: number;
  progress: number;
  outcome: 'ok' | 'erro' | null;
  busy: boolean;
}>();

const D = 'M20 40c40-14 70 12 110 0s60-16 100-2 70 14 110 0 70-14 140 0';
const path = ref<SVGPathElement | null>(null);
const total = ref(0);
const traveler = ref({ x: 20, y: 40 });

const xs = computed(() => props.stages.map((_, i) => 50 + i * (400 / Math.max(1, props.stages.length - 1))));

function stationY(x: number): number {
  if (!path.value || !total.value) return 40;
  // procura o ponto do caminho com esse x (caminho é monotônico em x)
  let lo = 0;
  let hi = total.value;
  for (let k = 0; k < 18; k++) {
    const mid = (lo + hi) / 2;
    if (path.value.getPointAtLength(mid).x < x) lo = mid;
    else hi = mid;
  }
  return path.value.getPointAtLength(lo).y;
}

const stationsY = ref<number[]>([]);

function place() {
  if (!path.value) return;
  const p = path.value.getPointAtLength(Math.max(0, Math.min(1, props.progress)) * total.value);
  traveler.value = { x: p.x, y: p.y };
}

onMounted(async () => {
  await nextTick();
  if (!path.value) return;
  total.value = path.value.getTotalLength();
  stationsY.value = xs.value.map(stationY);
  place();
});
watch(() => props.progress, place);

function state(i: number): 'done' | 'active' | 'todo' | 'bad' {
  if (props.outcome === 'ok') return 'done';
  if (i < props.current) return 'done';
  if (i === props.current) return props.outcome === 'erro' ? 'bad' : 'active';
  return 'todo';
}
</script>

<template>
  <div class="journey" :class="{ busy, ok: outcome === 'ok', bad: outcome === 'erro' }">
    <svg class="journey-art" viewBox="0 0 500 70" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path class="trail-guide" :d="D" />
      <path ref="path" class="trail" :d="D" :style="{ strokeDasharray: total, strokeDashoffset: total * (1 - Math.max(0, Math.min(1, progress))) }" />
      <g v-for="(x, i) in xs" :key="i" class="station" :class="state(i)" :transform="`translate(${x} ${stationsY[i] ?? 40})`">
        <circle r="9" />
        <circle r="3.4" class="dot" />
      </g>
      <g v-if="busy" class="traveler" :transform="`translate(${traveler.x} ${traveler.y})`">
        <circle r="6" />
      </g>
    </svg>
    <ol class="journey-labels">
      <li v-for="(s, i) in stages" :key="s.id" :class="state(i)">
        <span class="lbl">
          <Icon v-if="state(i) === 'done'" name="check" size="sm" />
          <Icon v-else-if="state(i) === 'bad'" name="alert" size="sm" />
          <span class="long">{{ s.label }}</span><span class="short">{{ s.short ?? s.label }}</span>
        </span>
        <small>{{ s.hint }}</small>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.journey {
  position: relative;
}
.journey-art {
  display: block;
  width: 100%;
  height: 62px;
  overflow: visible;
  fill: none;
  stroke-linecap: round;
}
.trail-guide {
  stroke: var(--line-2);
  stroke-width: 1.4;
  stroke-dasharray: 3 6;
}
.trail {
  stroke: var(--slate);
  stroke-width: 3;
  transition: stroke-dashoffset 0.7s var(--ease);
}
.ok .trail {
  stroke: var(--ok);
}
.bad .trail {
  stroke: var(--bad);
}
.station circle {
  fill: var(--paper-2);
  stroke: var(--ink-stroke);
  stroke-width: 1.4;
  vector-effect: non-scaling-stroke;
}
.station .dot {
  fill: var(--line-2);
  stroke: none;
}
.station.done circle:first-child {
  fill: var(--ok-soft);
  stroke: var(--ok);
}
.station.done .dot {
  fill: var(--ok);
}
.station.active circle:first-child {
  fill: var(--slate-soft);
  stroke: var(--slate);
  animation: station-pulse 1.4s var(--ease-in-out) infinite alternate;
  transform-box: fill-box;
  transform-origin: center;
}
.station.active .dot {
  fill: var(--slate);
}
.station.bad circle:first-child {
  fill: var(--bad-soft);
  stroke: var(--bad);
}
.station.bad .dot {
  fill: var(--bad);
}
.traveler circle {
  fill: var(--rose-ink);
  stroke: var(--paper-2);
  stroke-width: 2;
}
@keyframes station-pulse {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.18);
  }
}
.journey-labels {
  list-style: none;
  margin: 2px 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 4px;
  text-align: center;
}
.journey-labels li {
  min-width: 0;
}
.lbl {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font: 700 10.5px/1.3 var(--f-ui);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.journey-labels small {
  display: block;
  font-size: 11px;
  color: var(--ink-3);
  line-height: 1.3;
  margin-top: 2px;
}
.journey-labels .active .lbl {
  color: var(--slate-2);
}
.journey-labels .done .lbl {
  color: var(--ok);
}
.journey-labels .bad .lbl {
  color: var(--bad);
}
.short {
  display: none;
}
@media (max-width: 480px) {
  .journey-labels small,
  .long {
    display: none;
  }
  .short {
    display: inline;
  }
  .lbl {
    letter-spacing: 0.04em;
  }
}
</style>
