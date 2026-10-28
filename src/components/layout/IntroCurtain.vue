<script setup lang="ts">
/* Abertura no espírito do Nomadic Tribe: a cortina ardósia, a linha
   desenhada que termina de encher e o círculo de papel que se abre
   revelando o app. Uma vez por sessão, ~1,2 s, nunca bloqueia cliques
   depois de aberta e some no modo sem movimento. */
import { onMounted, ref } from 'vue';
import { useUiStore } from '@/stores/ui';

const ui = useUiStore();
const KEY = 'matreader:abertura';
const show = ref(false);
const phase = ref<'fill' | 'open' | 'done'>('fill');

function removeBoot() {
  const boot = document.getElementById('boot');
  if (!boot) return;
  boot.classList.add('out');
  setTimeout(() => boot.remove(), 520);
}

onMounted(() => {
  let seen = false;
  try {
    seen = sessionStorage.getItem(KEY) === '1';
    sessionStorage.setItem(KEY, '1');
  } catch {}
  if (seen || ui.still) {
    removeBoot();
    return;
  }
  show.value = true;
  requestAnimationFrame(() => document.getElementById('boot')?.remove());
  setTimeout(() => (phase.value = 'open'), 650);
  setTimeout(() => (phase.value = 'done'), 1250);
  setTimeout(() => (show.value = false), 1700);
});
</script>

<template>
  <div v-if="show" class="curtain" :class="phase" aria-hidden="true">
    <svg class="line" viewBox="0 0 10 180" fill="none" stroke-linecap="round">
      <path class="guide" d="M5 178c-.6-14 1.2-26 .4-40s-1.6-24-.2-38 1.4-25 .2-38-1.3-26-.3-40" />
      <path class="fill" d="M5 178c-.6-14 1.2-26 .4-40s-1.6-24-.2-38 1.4-25 .2-38-1.3-26-.3-40" />
    </svg>
    <p class="word">MatReader</p>
    <span class="circle" />
  </div>
</template>

<style scoped>
.curtain {
  position: fixed;
  inset: 0;
  z-index: 9500;
  display: grid;
  place-items: center;
  background: #5f6787 var(--grain);
  transition: opacity 0.45s var(--ease);
}
:root.theme-noite .curtain {
  background-color: #23263a;
}
.curtain.done {
  opacity: 0;
  pointer-events: none;
}
.line {
  width: 10px;
  height: 180px;
  overflow: visible;
}
.guide {
  stroke: rgba(255, 255, 255, 0.28);
  stroke-width: 1.2;
}
.fill {
  stroke: #fff;
  stroke-width: 3.4;
  stroke-dasharray: 190;
  stroke-dashoffset: 120;
  animation: fill 0.6s var(--ease) forwards;
}
@keyframes fill {
  to {
    stroke-dashoffset: 0;
  }
}
.word {
  position: absolute;
  bottom: 32px;
  left: 0;
  right: 0;
  margin: 0;
  text-align: center;
  color: rgba(255, 255, 255, 0.78);
  font: 600 12px/1.4 var(--f-ui);
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.circle {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 24px;
  height: 24px;
  margin: -12px 0 0 -12px;
  border-radius: 50%;
  background: var(--paper);
  transform: scale(0);
  transition: transform 0.6s var(--ease-in-out);
}
.open .circle,
.done .circle {
  transform: scale(160);
}
</style>
