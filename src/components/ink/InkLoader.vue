<script setup lang="ts">
/* A linha desenhada que se enche — o carregador do Nomadic Tribe, aqui na
   horizontal e com progresso real (0–1) ou indeterminado. */
withDefaults(defineProps<{ progress?: number | null; tone?: 'slate' | 'ok' | 'bad' }>(), { progress: null, tone: 'slate' });
const D = 'M2 6.2c18-1.4 34 1.2 52-.2s36-1.6 54 .1 34 1.3 52-.3 36-1.2 52 .4 26 .9 34-.2';
</script>

<template>
  <svg
class="ink-loader" :class="[tone, { indeterminate: progress === null }]" viewBox="0 0 248 12" preserveAspectRatio="none" role="progressbar"
    :aria-valuenow="progress === null ? undefined : Math.round(progress * 100)" aria-valuemin="0" aria-valuemax="100">
    <path class="guide" :d="D" pathLength="100" />
    <path class="fill" :d="D" pathLength="100" :style="progress === null ? undefined : { strokeDashoffset: 100 - Math.max(0, Math.min(1, progress)) * 100 }" />
  </svg>
</template>

<style scoped>
.ink-loader {
  display: block;
  width: 100%;
  height: 12px;
  overflow: visible;
  fill: none;
  stroke-linecap: round;
}
.guide {
  stroke: var(--line-2);
  stroke-width: 1.2;
}
.fill {
  stroke: var(--slate);
  stroke-width: 4;
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
  transition: stroke-dashoffset 0.6s var(--ease);
}
.ok .fill {
  stroke: var(--ok);
}
.bad .fill {
  stroke: var(--bad);
}
.indeterminate .fill {
  stroke-dasharray: 26 74;
  animation: loader-run 1.8s var(--ease-in-out) infinite;
}
@keyframes loader-run {
  from {
    stroke-dashoffset: 100;
  }
  to {
    stroke-dashoffset: -26;
  }
}
</style>
