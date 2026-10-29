<script setup lang="ts">
/* Paisagem da Entrada — ocupa o bloco inteiro, sem moldura em arco.
   Flat, com profundidade: sete camadas (céu, astros, serra distante,
   montanhas, colinas com casa e moinho, campo com o lote, primeiro plano)
   que se deslocam em paralaxe com o ponteiro.
   Ciclo dia/noite contínuo (CSS): o sol e a lua giram na mesma órbita, o
   céu passa por aurora, dia, poente e noite, a terra escurece junto
   (cada camada declara a sua cor de dia e de noite), as estrelas
   aparecem, as janelas acendem e os vaga-lumes saem. O tema noite começa
   o ciclo à noite. Com menos movimento, a cena para num retrato fixo (dia
   no tema papel, noite no tema noite).
   Reage ao que acontece: arrastar (o lote pulsa e o contorno marcha),
   converter (o pássaro mensageiro atravessa o céu e o moinho acelera),
   pronto (o lote ganha cor e a bandeira tremula) e erro (o céu avermelha). */
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
const layer = (depth: number) => computed(() => `translate(${(px.value * depth).toFixed(2)} ${(py.value * depth * 0.45).toFixed(2)})`);
const sky = layer(-1.5);
const range = layer(-2.5);
const mount = layer(-3.5);
const hills = layer(-5);
const field = layer(-7);
const near = layer(-11);

onMounted(() => host.value?.addEventListener('pointermove', onMove, { passive: true }));
onBeforeUnmount(() => host.value?.removeEventListener('pointermove', onMove));
</script>

<template>
  <div ref="host" class="scene" :class="[`is-${props.state}`, { 'night-start': ui.dark }]" @pointerleave="onLeave">
    <svg class="scene-art" viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="sc-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" class="sky-top cyc" />
          <stop offset=".55" class="sky-mid cyc" />
          <stop offset=".82" class="sky-low cyc" />
        </linearGradient>
        <radialGradient id="sc-glow">
          <stop offset="0" stop-color="#ffe9a6" stop-opacity=".95" />
          <stop offset="1" stop-color="#ffe9a6" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="sc-mist" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fffaf3" stop-opacity="0" />
          <stop offset=".5" stop-color="#fffaf3" stop-opacity=".8" />
          <stop offset="1" stop-color="#fffaf3" stop-opacity="0" />
        </linearGradient>
        <pattern id="sc-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
          <path d="M0 3h6" class="hatch-line" />
        </pattern>
      </defs>

      <!-- céu -->
      <rect class="sky" width="400" height="300" fill="url(#sc-sky)" />
      <g class="stars cyc">
        <circle cx="24" cy="18" r="1.1" /><circle cx="58" cy="44" r=".8" /><circle cx="92" cy="14" r="1.2" /><circle cx="128" cy="56" r=".9" />
        <circle cx="166" cy="26" r="1" /><circle cx="214" cy="10" r=".8" /><circle cx="244" cy="46" r="1.2" /><circle cx="284" cy="18" r=".9" />
        <circle cx="318" cy="62" r="1.1" /><circle cx="350" cy="30" r=".8" /><circle cx="384" cy="52" r="1" /><circle cx="40" cy="84" r=".8" />
        <circle cx="110" cy="96" r="1" /><circle cx="196" cy="74" r=".8" /><circle cx="268" cy="92" r="1" /><circle cx="338" cy="100" r=".8" />
        <path class="twinkle t1" d="M72 26v8M68 30h8" /><path class="twinkle t2" d="M232 28v8M228 32h8" /><path class="twinkle t3" d="M362 78v8M358 82h8" />
      </g>
      <g class="px" :transform="sky">
        <g class="orbit cyc">
          <circle class="sun-halo cyc" cx="200" cy="78" r="30" />
          <circle class="sun" cx="200" cy="78" r="16" />
          <g transform="rotate(180 200 250)">
            <path class="moon" d="M200 65A13 13 0 1 0 200 91 7.5 13 0 1 1 200 65Z" />
            <circle class="crater" cx="194" cy="74" r="1.6" /><circle class="crater" cx="196" cy="83" r="1.1" />
          </g>
        </g>
        <path class="cloud c1 land cyc" d="M60 104c-2-10 10-16 18-11 3-11 22-12 26 0 9-4 19 3 15 12 7 2 6 12-2 12H62c-9 0-10-11-2-13z" />
        <path class="cloud c2 land cyc" d="M232 62c-1-7 7-11 13-7 3-8 16-8 18 0 7-2 13 2 11 9 5 2 4 9-2 9h-38c-7 0-8-9-2-11z" />
        <path class="cloud c3 land cyc" d="M150 132c-1-6 6-9 11-6 2-7 13-7 15 0 6-2 11 2 9 7 4 2 3 8-2 8h-31c-6 0-7-7-2-9z" />
      </g>

      <!-- serra distante e montanhas -->
      <g class="px" :transform="range">
        <path class="land far-range cyc" d="M-20 196l40-26 26 12 38-30 34 24 36-18 38 22 40-30 38 26 34-18 38 24 36-16 22 10v58H-20z" />
      </g>
      <g class="px" :transform="mount">
        <path class="land mount cyc" d="M-12 206l68-52 34 26 56-52 54 50 46-32 60 44 52-30 54 34v60H-12z" />
        <path class="land snow cyc" d="M146 128l14 13-9-2-6 6-7-6-8 3zM302 160l11 9-7-1-4 4-5-4-6 2zM56 154l9 8-6-1-3 4-4-4-5 2z" />
        <rect class="mist cyc" x="-30" y="182" width="460" height="40" fill="url(#sc-mist)" />
      </g>

      <!-- colinas: moinho, árvores e a casa -->
      <g class="px" :transform="hills">
        <path class="land hill cyc" d="M-12 222c56-28 118-24 176-14s124-26 182-20c30 3 50 10 66 16v56H-12z" />
        <g class="windmill">
          <path class="land tower cyc" d="M73 212l3.4-22h5.2l3.4 22z" />
          <g class="blades">
            <path d="M79 189l-1.6-17 4.4 1.2zM79 189l17 -1.6-1.2 4.4zM79 189l1.6 17-4.4-1.2zM79 189l-17 1.6 1.2-4.4z" />
          </g>
          <circle class="hub" cx="79" cy="189" r="2" />
        </g>
        <g class="trees">
          <g class="tree" style="--d: 0s"><path class="trunk" d="M130 214v-9" /><circle class="land canopy cyc" cx="130" cy="200" r="6.5" /></g>
          <g class="tree" style="--d: -1.2s"><path class="trunk" d="M146 216v-7" /><circle class="land canopy cyc" cx="146" cy="205" r="5" /></g>
          <g class="tree" style="--d: -2.1s"><path class="trunk" d="M232 210v-9" /><circle class="land canopy cyc" cx="232" cy="196" r="7.5" /></g>
          <g class="tree" style="--d: -0.6s"><path class="trunk" d="M250 212v-7" /><circle class="land canopy cyc" cx="250" cy="201" r="5" /></g>
          <g class="tree" style="--d: -1.7s"><path class="trunk" d="M354 214v-8" /><circle class="land canopy cyc" cx="354" cy="201" r="6.5" /></g>
        </g>
        <g class="house">
          <rect class="land wall cyc" x="289" y="199" width="25" height="16" />
          <path class="land roof cyc" d="M285 200l16.5-13 16.5 13z" />
          <rect class="land chimney cyc" x="308" y="186" width="4.5" height="8" />
          <rect class="land door cyc" x="298.5" y="206" width="6" height="9" />
          <rect class="window" x="291.5" y="202.5" width="5" height="5" />
          <rect class="window" x="307" y="202.5" width="5" height="5" />
        </g>
        <circle class="win-glow cyc" cx="301" cy="205" r="18" fill="url(#sc-glow)" />
        <g class="smoke">
          <circle cx="310" cy="182" r="3" /><circle cx="310" cy="182" r="3" /><circle cx="310" cy="182" r="3" />
        </g>
      </g>

      <!-- campo, rio, estrada e o lote demarcado -->
      <g class="px" :transform="field">
        <path class="land field cyc" d="M-12 236c86-18 192-10 276-16 50-4 96-10 148-4v88H-12z" />
        <path class="river cyc" d="M334 218c-16 12 10 22-6 36s8 30-8 54" />
        <path class="river-shine" d="M334 218c-16 12 10 22-6 36s8 30-8 54" />
        <path class="road cyc" d="M301 216c-4 12-26 18-42 32s-26 32-34 56" />
        <g class="furrows">
          <path d="M14 270c60-8 120-10 182-8M30 288c70-8 140-10 210-8M72 252c40-4 80-6 120-5" />
        </g>
        <g class="lot">
          <path class="lot-fill" d="M110 256 198 236l86 12-28 30-112 4z" />
          <path class="lot-line" d="M110 256 198 236l86 12-28 30-112 4z" />
          <g class="stakes">
            <path d="M198 236v-14l7 3-7 3M284 248v-14l7 3-7 3M256 278v-14l7 3-7 3M144 282v-14l7 3-7 3" />
          </g>
          <g class="flag">
            <path class="pole" d="M110 256v-20" />
            <path class="cloth" d="M110 236c4-2 8 2 12 0v8c-4 2-8-2-12 0z" />
          </g>
          <circle class="v0" cx="110" cy="256" r="3.4" />
          <circle cx="198" cy="236" r="2.6" /><circle cx="284" cy="248" r="2.6" /><circle cx="256" cy="278" r="2.6" /><circle cx="144" cy="282" r="2.6" />
        </g>
      </g>

      <!-- revoada de dia -->
      <g class="flock cyc">
        <path class="wing" d="M0 0c3-3 6-3 8 0 2-3 5-3 8 0" />
        <path class="wing w2" d="M14 -8c2.4-2.4 4.8-2.4 6.4 0 1.6-2.4 4-2.4 6.4 0" />
        <path class="wing w3" d="M-12 -12c2-2 4-2 5.4 0 1.4-2 3.4-2 5.4 0" />
      </g>

      <!-- primeiro plano -->
      <g class="px" :transform="near">
        <g class="fern">
          <path d="M8 304c6-30 18-52 40-70M20 280c-8-4-14-4-20 0M28 264c-8-5-15-6-22-2M38 250c-6-6-13-8-20-6M24 274c6-6 13-8 20-7M33 258c6-6 12-9 19-9" />
        </g>
        <g class="grass">
          <path style="--d: 0s" d="M66 302c0-10 2-18 6-24" /><path style="--d: -.8s" d="M74 302c1-12 0-20-3-28" /><path style="--d: -1.6s" d="M82 302c0-8 3-14 7-18" />
          <path style="--d: -.4s" d="M300 302c0-10-2-18-6-24" /><path style="--d: -1.2s" d="M308 302c-1-12 1-20 4-27" /><path style="--d: -2s" d="M290 302c0-7-2-12-5-16" />
        </g>
        <g class="land leaves cyc">
          <path d="M356 304c-6-24 2-44 22-58 4 22-4 42-22 58z" />
          <path d="M376 306c4-18 14-30 30-36-2 18-12 30-30 36z" />
          <path class="vein" d="M356 304c4-16 10-30 22-58M376 306c8-12 16-24 30-36" />
        </g>
        <g class="mush">
          <path class="land cap cyc" d="M322 282c0-10 8-16 16-16s16 6 16 16z" />
          <path class="land stem cyc" d="M334 282v14h8v-14" />
          <path class="land cap cyc" d="M300 292c0-7 5-11 11-11s11 4 11 11z" />
          <path class="land stem cyc" d="M308 292v10h6v-10" />
        </g>
        <g class="fireflies cyc">
          <g transform="translate(64 258)"><g class="ff" style="--d: 0s; --t: 7s"><circle r="5" fill="url(#sc-glow)" /><circle r="1.3" /></g></g>
          <g transform="translate(150 240)"><g class="ff" style="--d: -1.4s; --t: 9s"><circle r="5" fill="url(#sc-glow)" /><circle r="1.3" /></g></g>
          <g transform="translate(232 268)"><g class="ff" style="--d: -2.6s; --t: 8s"><circle r="5" fill="url(#sc-glow)" /><circle r="1.3" /></g></g>
          <g transform="translate(300 232)"><g class="ff" style="--d: -3.3s; --t: 10s"><circle r="5" fill="url(#sc-glow)" /><circle r="1.3" /></g></g>
          <g transform="translate(372 260)"><g class="ff" style="--d: -4.1s; --t: 7.5s"><circle r="5" fill="url(#sc-glow)" /><circle r="1.3" /></g></g>
        </g>
      </g>

      <!-- o mensageiro (durante a conversão) -->
      <g class="messenger">
        <path d="M0 6c4-3 8-3 12 0 3-6 8-9 15-10-4 3-7 7-8 11 3 0 6 1 8 3-7 0-14 1-20 1-3 0-5-2-7-5z" />
      </g>
      <rect class="err-tint" width="400" height="300" />
    </svg>
    <div class="scene-overlay">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.scene {
  /* um dia inteiro em 96 s; o tema papel começa de manhã, o noite à noite */
  --cycle: 96s;
  --start: -0.1;
  position: absolute;
  inset: 0;
  overflow: hidden;
  isolation: isolate;
}
.scene.night-start {
  --start: -0.68;
}
.scene-art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.px {
  transition: transform 0.7s var(--ease);
}
/* tudo o que segue o relógio do dia */
.cyc {
  animation-duration: var(--cycle);
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  animation-delay: calc(var(--cycle) * var(--start));
}

/* ---------- céu ---------- */
.sky-top {
  stop-color: #c9d6e6;
  animation-name: sky-top;
}
.sky-mid {
  stop-color: #ecdcd2;
  animation-name: sky-mid;
}
.sky-low {
  stop-color: #f8ece2;
  animation-name: sky-low;
}
:root.theme-noite .sky-top {
  stop-color: #1b1f3f;
}
:root.theme-noite .sky-mid {
  stop-color: #2a2f5c;
}
:root.theme-noite .sky-low {
  stop-color: #45487a;
}
@keyframes sky-top {
  0%, 100% { stop-color: #e9b7b0; }
  8% { stop-color: #c9d6e6; }
  25% { stop-color: #b9cfe5; }
  42% { stop-color: #c4cde3; }
  50% { stop-color: #a98bb2; }
  56% { stop-color: #4b4776; }
  63%, 88% { stop-color: #1b1f3f; }
  95% { stop-color: #3d3b6d; }
}
@keyframes sky-mid {
  0%, 100% { stop-color: #f3cbbd; }
  8% { stop-color: #ecdcd2; }
  25% { stop-color: #dde8ee; }
  42% { stop-color: #ecd9cc; }
  50% { stop-color: #e9a58e; }
  56% { stop-color: #8a6f9c; }
  63%, 88% { stop-color: #2a2f5c; }
  95% { stop-color: #7f6a98; }
}
@keyframes sky-low {
  0%, 100% { stop-color: #f8dfc9; }
  8% { stop-color: #f8ece2; }
  25% { stop-color: #f6f0e6; }
  42% { stop-color: #f6e3d0; }
  50% { stop-color: #f5c895; }
  56% { stop-color: #d29b9c; }
  63%, 88% { stop-color: #45487a; }
  95% { stop-color: #d8a3a0; }
}

.stars {
  fill: #fff8e7;
  stroke: #fff8e7;
  stroke-width: 0.9;
  opacity: 0;
  animation-name: stars;
}
.stars circle {
  stroke: none;
}
:root.theme-noite .stars {
  opacity: 1;
}
@keyframes stars {
  0%, 53%, 97%, 100% { opacity: 0; }
  62%, 90% { opacity: 1; }
}
.twinkle {
  transform-box: fill-box;
  transform-origin: center;
  animation: twinkle 2.6s var(--ease-in-out) infinite;
}
.t2 {
  animation-delay: -0.9s;
}
.t3 {
  animation-delay: -1.7s;
}
@keyframes twinkle {
  50% {
    transform: scale(0.35) rotate(45deg);
    opacity: 0.4;
  }
}

/* sol e lua: a mesma órbita, meia volta de distância */
.orbit {
  transform-box: view-box;
  transform-origin: 200px 250px;
  transform: rotate(40deg);
  animation-name: orbit;
}
:root.theme-noite .orbit {
  transform: rotate(140deg);
}
@keyframes orbit {
  from {
    transform: rotate(-90deg);
  }
  to {
    transform: rotate(270deg);
  }
}
.sun {
  fill: #f9dcc0;
  stroke: #24222b;
  stroke-width: 1;
}
.sun-halo {
  fill: #fbe3c4;
  opacity: 0.45;
  animation-name: halo;
}
@keyframes halo {
  0%, 100% { opacity: 0.6; }
  20%, 40% { opacity: 0.35; }
  50% { opacity: 0.85; }
  58% { opacity: 0; }
}
.moon {
  fill: #f1ead9;
  stroke: #24222b;
  stroke-width: 1;
}
.crater {
  fill: #d9d0bc;
}

/* terra: cada camada declara a cor de dia e a de noite; o mesmo relógio
   passa pela aurora, dia, poente quente e noite */
.land {
  fill: var(--day);
  animation-name: land;
}
:root.theme-noite .land {
  fill: var(--night);
}
@keyframes land {
  0%, 100% { fill: color-mix(in srgb, var(--day), var(--night) 38%); }
  8%, 44% { fill: var(--day); }
  51% { fill: color-mix(in srgb, var(--day), #e58f6c 24%); }
  60%, 88% { fill: var(--night); }
  95% { fill: color-mix(in srgb, var(--day), var(--night) 60%); }
}
.cloud {
  --day: #fbf5ee;
  --night: #55577c;
  stroke: #24222b;
  stroke-width: 1.1;
}
.c1 {
  animation:
    land var(--cycle) linear calc(var(--cycle) * var(--start)) infinite,
    drift 92s linear -30s infinite;
}
.c2 {
  animation:
    land var(--cycle) linear calc(var(--cycle) * var(--start)) infinite,
    drift 128s linear -90s infinite;
}
.c3 {
  animation:
    land var(--cycle) linear calc(var(--cycle) * var(--start)) infinite,
    drift 74s linear -50s infinite;
  opacity: 0.85;
}
@keyframes drift {
  from {
    transform: translateX(-200px);
  }
  to {
    transform: translateX(420px);
  }
}
.far-range {
  --day: #d3cbe0;
  --night: #393b60;
}
.mount {
  --day: #aab2c9;
  --night: #4a5179;
  stroke: #24222b;
  stroke-width: 1.1;
}
.snow {
  --day: #f6f1ea;
  --night: #a7adcb;
  stroke: #24222b;
  stroke-width: 0.8;
}
.mist {
  opacity: 0.5;
  animation-name: mist;
}
:root.theme-noite .mist {
  opacity: 0;
}
@keyframes mist {
  0%, 100% { opacity: 0.55; }
  7% { opacity: 0.9; }
  18%, 90% { opacity: 0; }
}
.hill {
  --day: #b5ccc3;
  --night: #3d5b5c;
  stroke: #24222b;
  stroke-width: 1.1;
}
.tower {
  --day: #f4ece0;
  --night: #8e8aa1;
  stroke: #24222b;
  stroke-width: 1;
}
.blades {
  fill: #fbf7f1;
  stroke: #24222b;
  stroke-width: 0.9;
  transform-box: view-box;
  transform-origin: 79px 189px;
  animation: spin 11s linear infinite;
}
.hub {
  fill: #24222b;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.tree {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: sway 4.2s var(--ease-in-out) var(--d) infinite alternate;
}
.trunk {
  stroke: #24222b;
  stroke-width: 1.4;
}
.canopy {
  --day: #8db3a5;
  --night: #2e4f4f;
  stroke: #24222b;
  stroke-width: 1;
}
@keyframes sway {
  from {
    transform: rotate(-2.5deg);
  }
  to {
    transform: rotate(2.5deg);
  }
}
.house :is(rect, path) {
  stroke: #24222b;
  stroke-width: 1;
}
.wall {
  --day: #f6efe3;
  --night: #8b879e;
}
.roof {
  --day: #c98473;
  --night: #67444b;
}
.chimney {
  --day: #b9776a;
  --night: #5b3d44;
}
.door {
  --day: #8a5a44;
  --night: #3b2a2c;
}
.window {
  fill: #e3dccd;
  animation: lights var(--cycle) linear calc(var(--cycle) * var(--start)) infinite;
}
:root.theme-noite .window {
  fill: #ffd979;
}
@keyframes lights {
  0%, 53%, 95%, 100% { fill: #e3dccd; }
  56%, 92% { fill: #ffd979; }
}
.win-glow {
  opacity: 0;
  animation-name: glow;
}
:root.theme-noite .win-glow {
  opacity: 1;
}
@keyframes glow {
  0%, 53%, 95%, 100% { opacity: 0; }
  57%, 92% { opacity: 1; }
}
.smoke circle {
  fill: #fbf7f1;
  stroke: #24222b;
  stroke-width: 0.7;
  opacity: 0;
  transform-box: fill-box;
  transform-origin: center;
  animation: smoke 5.4s var(--ease) infinite;
}
.smoke circle:nth-child(2) {
  animation-delay: -1.8s;
}
.smoke circle:nth-child(3) {
  animation-delay: -3.6s;
}
@keyframes smoke {
  0% {
    transform: translate(0, 0) scale(0.5);
    opacity: 0;
  }
  15% {
    opacity: 0.8;
  }
  100% {
    transform: translate(9px, -30px) scale(2);
    opacity: 0;
  }
}

/* ---------- campo ---------- */
.field {
  --day: #e7d9a9;
  --night: #5d5944;
  stroke: #24222b;
  stroke-width: 1.1;
}
.river {
  --day: #8ba7c5;
  --night: #34507c;
  stroke: var(--day);
  stroke-width: 9;
  animation-name: river;
}
:root.theme-noite .river {
  stroke: var(--night);
}
@keyframes river {
  0%, 100% { stroke: color-mix(in srgb, var(--day), var(--night) 38%); }
  8%, 44% { stroke: var(--day); }
  51% { stroke: color-mix(in srgb, var(--day), #e58f6c 24%); }
  60%, 88% { stroke: var(--night); }
  95% { stroke: color-mix(in srgb, var(--day), var(--night) 60%); }
}
.river-shine {
  stroke: #eef4fa;
  stroke-width: 1.6;
  stroke-dasharray: 3 13;
  opacity: 0.8;
  animation: shine 3.2s linear infinite;
}
@keyframes shine {
  to {
    stroke-dashoffset: -32;
  }
}
.road {
  --day: #f3e6c2;
  --night: #6d6852;
  stroke: var(--day);
  stroke-width: 6;
  animation-name: river;
}
:root.theme-noite .road {
  stroke: var(--night);
}
.furrows path {
  stroke: rgba(30, 28, 36, 0.28);
  stroke-width: 0.9;
  stroke-dasharray: 3 5;
}
.lot-fill {
  fill: url(#sc-hatch);
  transition: fill 0.6s var(--ease);
}
.hatch-line {
  stroke: #974a40;
  stroke-width: 1;
  opacity: 0.6;
}
.lot-line {
  stroke: #24222b;
  stroke-width: 1.6;
  stroke-dasharray: 5 4;
}
:root.theme-noite .lot-line,
:root.theme-noite .stakes path {
  stroke: #f1e9dd;
}
.stakes path {
  stroke: #24222b;
  stroke-width: 1.1;
}
/* à noite o contorno do lote vira giz claro para seguir legível */
.lot-line,
.stakes path {
  animation: chalk var(--cycle) linear calc(var(--cycle) * var(--start)) infinite;
}
@keyframes chalk {
  0%, 52%, 96%, 100% { stroke: #24222b; }
  60%, 88% { stroke: #f1e9dd; }
}
.lot circle {
  fill: #fbf7f1;
  stroke: #24222b;
  stroke-width: 1.1;
}
.lot circle.v0 {
  fill: #974a40;
}
.pole {
  stroke: #24222b;
  stroke-width: 1.3;
}
.cloth {
  fill: #e4b4a9;
  stroke: #24222b;
  stroke-width: 1;
  transform-box: fill-box;
  transform-origin: 0 50%;
  animation: flutter 1.8s var(--ease-in-out) infinite alternate;
}
@keyframes flutter {
  to {
    transform: skewY(-8deg) scaleX(0.86);
  }
}

/* ---------- revoada (só de dia) ---------- */
.flock {
  fill: none;
  stroke: #24222b;
  stroke-width: 1.1;
  opacity: 0;
  animation-name: flock;
}
@keyframes flock {
  0%, 9% { transform: translate(-40px, 70px); opacity: 0; }
  10% { opacity: 1; }
  26% { transform: translate(440px, 38px); opacity: 1; }
  27%, 100% { transform: translate(440px, 38px); opacity: 0; }
}
.wing {
  transform-box: fill-box;
  transform-origin: center;
  animation: flap 0.42s var(--ease-in-out) infinite alternate;
}
.w2 {
  animation-delay: -0.15s;
}
.w3 {
  animation-delay: -0.3s;
}
@keyframes flap {
  to {
    transform: scaleY(-0.6);
  }
}

/* ---------- primeiro plano ---------- */
.fern path {
  stroke: #3f7470;
  stroke-width: 1.6;
}
:root.theme-noite .fern path {
  stroke: #6fa59d;
}
.grass path {
  stroke: #3f7470;
  stroke-width: 1.4;
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: sway 3.2s var(--ease-in-out) var(--d) infinite alternate;
}
.leaves {
  --day: #9cb8b3;
  --night: #345654;
  stroke: #24222b;
  stroke-width: 1.1;
}
.leaves .vein {
  fill: none;
  stroke-width: 0.8;
}
.cap {
  --day: #e5c35b;
  --night: #8c7638;
  stroke: #24222b;
  stroke-width: 1.1;
}
.stem {
  --day: #fbf4ea;
  --night: #a19c9b;
  stroke: #24222b;
  stroke-width: 1.1;
}
.fireflies {
  fill: #fff4b8;
  opacity: 0;
  animation-name: fireflies;
}
:root.theme-noite .fireflies {
  opacity: 1;
}
@keyframes fireflies {
  0%, 58%, 93%, 100% { opacity: 0; }
  63%, 89% { opacity: 1; }
}
/* cada vaga-lume vagueia em volta do seu ponto, no seu ritmo */
.ff {
  animation:
    float var(--t) var(--ease-in-out) var(--d) infinite,
    blink 2.3s var(--ease-in-out) var(--d) infinite;
}
@keyframes float {
  25% {
    transform: translate(14px, -10px);
  }
  50% {
    transform: translate(26px, 4px);
  }
  75% {
    transform: translate(8px, 12px);
  }
}
@keyframes blink {
  50% {
    opacity: 0.25;
  }
}

/* ---------- estados ---------- */
.messenger {
  opacity: 0;
}
.messenger path {
  fill: #fbf7f1;
  stroke: #24222b;
  stroke-width: 1.1;
}
.err-tint {
  fill: #a13b32;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.6s var(--ease);
}
.is-error .err-tint {
  opacity: 0.16;
}
.is-over .lot-line {
  stroke: #974a40;
  stroke-width: 2.4;
  animation: lot-march 0.9s linear infinite;
}
.is-over .lot-fill {
  animation: lot-breathe 1.2s var(--ease-in-out) infinite alternate;
}
.is-over .scene-art {
  transform: scale(1.025);
}
.scene-art {
  transition: transform 0.8s var(--ease);
}
.is-done .lot-fill {
  fill: rgba(63, 116, 112, 0.42);
}
.is-done .lot-line {
  stroke-dasharray: none;
}
.flag {
  opacity: 0;
  transition: opacity 0.4s var(--ease);
}
.is-done .flag {
  opacity: 1;
}
.is-busy .messenger {
  opacity: 1;
  animation: messenger 4.2s var(--ease-in-out) infinite;
}
.is-busy .blades {
  animation-duration: 2.4s;
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
@keyframes messenger {
  0% {
    transform: translate(-30px, 96px) scale(0.9);
  }
  50% {
    transform: translate(200px, 66px) scale(1.05);
  }
  100% {
    transform: translate(430px, 84px) scale(0.9);
  }
}

.scene-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
}
</style>
