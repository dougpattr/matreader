<script setup lang="ts">
/* Ícone de traço do sprite (src/assets/ink-sprite.ts). */
defineProps<{ name: string; size?: 'sm' | 'lg' | 'xl' }>();
</script>

<template>
  <svg class="ink-icon" :class="size" aria-hidden="true" focusable="false"><use :href="`#ink-${name}`" /></svg>
</template>
