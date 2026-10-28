<script setup lang="ts">
/* Pictograma desenhado (pena, cristal, pássaro…), como os do Nomadic Tribe.
   draw = traço que se desenha ao aparecer (respeita movimento reduzido). */
defineProps<{ name: string; size?: number; draw?: boolean }>();
</script>

<template>
  <svg
    class="picto"
    :class="{ 'picto--draw': draw }"
    :width="size ?? 40"
    :height="size ?? 40"
    viewBox="0 0 48 48"
    aria-hidden="true"
    focusable="false"
  >
    <use :href="`#picto-${name}`" />
  </svg>
</template>

<style scoped>
.picto {
  flex: none;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
  overflow: visible;
}
.picto--draw {
  stroke-dasharray: 220;
  stroke-dashoffset: 220;
  animation: picto-draw 1.4s var(--ease) 0.15s forwards;
}
@keyframes picto-draw {
  to {
    stroke-dashoffset: 0;
  }
}
</style>
