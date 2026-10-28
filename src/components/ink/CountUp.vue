<script setup lang="ts">
/* Número que conta até o valor — vida sem ruído (e estático no modo sem
   movimento). */
import { onBeforeUnmount, ref, watch } from 'vue';
import { fmt, fmtInt } from '@/core/format';
import { useUiStore } from '@/stores/ui';

const props = withDefaults(defineProps<{ value: number; dec?: number }>(), { dec: 0 });
const ui = useUiStore();
const shown = ref('—');
let raf = 0;

const format = (n: number) => (props.dec ? fmt(n, props.dec) : fmtInt(n));

function run(to: number) {
  cancelAnimationFrame(raf);
  if (!Number.isFinite(to)) {
    shown.value = '—';
    return;
  }
  if (ui.still || to === 0) {
    shown.value = format(to);
    return;
  }
  const t0 = performance.now();
  const dur = 700;
  const tick = (t: number) => {
    const k = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    shown.value = format(props.dec ? to * e : Math.round(to * e));
    if (k < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}

watch(() => props.value, run, { immediate: true });
onBeforeUnmount(() => cancelAnimationFrame(raf));
</script>

<template>
  <span class="num">{{ shown }}</span>
</template>
