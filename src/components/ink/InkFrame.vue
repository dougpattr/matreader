<script setup lang="ts">
/* Moldura de nanquim desenhada à mão: um retângulo arredondado com leve
   tremor, gerado por semente (fica igual a cada redesenho) e refeito
   quando o elemento muda de tamanho. Dois traços sobrepostos dão o
   aspecto de pena. Com live, ganha mais duas variações do traço principal
   e uma faísca: o pai com .live-frame faz o traço "ferver" e a faísca
   correr pela borda no hover (motion.css). Puramente decorativo. */
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { hashString, seeded } from '@/core/browser';

const props = withDefaults(defineProps<{ seed?: string; radius?: number; jitter?: number; draw?: boolean; live?: boolean }>(), {
  seed: 'frame',
  radius: 12,
  jitter: 1.1,
  draw: false,
  live: false,
});

const host = ref<SVGSVGElement | null>(null);
const d1 = ref('');
const d2 = ref('');
const b1 = ref('');
const b2 = ref('');
const size = ref({ w: 0, h: 0 });
const drawn = ref(!props.draw);
let ro: ResizeObserver | null = null;
let raf = 0;

function roundedRectPoints(w: number, h: number, r: number, step: number): [number, number][] {
  const pts: [number, number][] = [];
  const inset = 1.2;
  const x0 = inset;
  const y0 = inset;
  const x1 = w - inset;
  const y1 = h - inset;
  const rr = Math.max(2, Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2));
  const line = (ax: number, ay: number, bx: number, by: number) => {
    const len = Math.hypot(bx - ax, by - ay);
    const n = Math.max(1, Math.round(len / step));
    for (let i = 0; i < n; i++) pts.push([ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n]);
  };
  const arc = (cx: number, cy: number, a0: number, a1: number) => {
    const n = 4;
    for (let i = 0; i < n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
    }
  };
  line(x0 + rr, y0, x1 - rr, y0);
  arc(x1 - rr, y0 + rr, -Math.PI / 2, 0);
  line(x1, y0 + rr, x1, y1 - rr);
  arc(x1 - rr, y1 - rr, 0, Math.PI / 2);
  line(x1 - rr, y1, x0 + rr, y1);
  arc(x0 + rr, y1 - rr, Math.PI / 2, Math.PI);
  line(x0, y1 - rr, x0, y0 + rr);
  arc(x0 + rr, y0 + rr, Math.PI, Math.PI * 1.5);
  return pts;
}

/** Catmull-Rom fechado → Bézier cúbica. */
function smoothClosed(pts: [number, number][]): string {
  const n = pts.length;
  if (n < 3) return '';
  const p = (i: number) => pts[(i + n) % n]!;
  let d = `M${p(0)[0].toFixed(1)} ${p(0)[1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = p(i - 1);
    const [x1, y1] = p(i);
    const [x2, y2] = p(i + 1);
    const [x3, y3] = p(i + 2);
    const c1x = x1 + (x2 - x0) / 6;
    const c1y = y1 + (y2 - y0) / 6;
    const c2x = x2 - (x3 - x1) / 6;
    const c2y = y2 - (y3 - y1) / 6;
    d += `C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }
  return d + 'Z';
}

function wobble(w: number, h: number, seed: number, amp: number): string {
  const rnd = seeded(seed);
  const base = roundedRectPoints(w, h, props.radius, 26);
  // tremor suave: média com o vizinho, para não serrilhar
  const raw = base.map(() => (rnd() * 2 - 1) * amp);
  const pts = base.map(([x, y], i) => {
    const j = (raw[i]! + raw[(i + 1) % raw.length]! + raw[(i - 1 + raw.length) % raw.length]!) / 3;
    const k = (rnd() * 2 - 1) * amp * 0.5;
    return [x + j, y + k] as [number, number];
  });
  return smoothClosed(pts);
}

function redraw() {
  const svg = host.value;
  const parent = svg?.parentElement;
  if (!svg || !parent) return;
  const w = parent.clientWidth;
  const h = parent.clientHeight;
  if (!w || !h || (w === size.value.w && h === size.value.h)) return;
  size.value = { w, h };
  const s = hashString(props.seed);
  d1.value = wobble(w, h, s, props.jitter);
  d2.value = wobble(w, h, s ^ 0x9e3779b9, props.jitter * 1.3);
  if (props.live) {
    b1.value = wobble(w, h, s ^ 0x85ebca6b, props.jitter * 1.25);
    b2.value = wobble(w, h, s ^ 0xc2b2ae35, props.jitter * 1.25);
  }
}

onMounted(() => {
  const parent = host.value?.parentElement;
  if (!parent) return;
  redraw();
  ro = new ResizeObserver(() => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(redraw);
  });
  ro.observe(parent);
  if (props.draw) requestAnimationFrame(() => (drawn.value = true));
});

onBeforeUnmount(() => {
  ro?.disconnect();
  cancelAnimationFrame(raf);
});
</script>

<template>
  <svg
    ref="host"
    class="ink-frame"
    :class="{ 'is-drawn': drawn, 'will-draw': draw }"
    :viewBox="`0 0 ${size.w || 1} ${size.h || 1}`"
    preserveAspectRatio="none"
    aria-hidden="true"
    focusable="false"
  >
    <path class="f1 v0" pathLength="1000" :d="d1" />
    <template v-if="live">
      <path class="f1 v1" :d="b1" />
      <path class="f1 v2" :d="b2" />
    </template>
    <path class="f2" pathLength="1000" :d="d2" />
    <path v-if="live" class="spark" pathLength="1000" :d="d1" />
  </svg>
</template>

<style scoped>
.ink-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
  z-index: 3;
  fill: none;
  stroke: var(--frame-color, var(--ink-stroke));
  stroke-linecap: round;
  stroke-linejoin: round;
}
.f1 {
  stroke-width: 1.5;
  opacity: 0.85;
}
.f2 {
  stroke-width: 0.8;
  opacity: 0.35;
}
.will-draw :is(.v0, .f2) {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  transition: stroke-dashoffset 1.3s var(--ease);
}
.will-draw.is-drawn :is(.v0, .f2) {
  stroke-dashoffset: 0;
}
.will-draw.is-drawn .f2 {
  transition-delay: 0.25s;
}
</style>
