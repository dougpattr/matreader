<script setup lang="ts">
/* Ícone de traço (src/assets/ink-sprite.ts), desenhado inline: a classe
   i-<nome> e as partes marcadas (.a/.b) ganham micro-movimentos quando o
   controle que contém o ícone recebe o ponteiro ou o foco (motion.css). */
import { computed } from 'vue';
import { ICON_BODY } from '@/assets/ink-sprite';

const props = defineProps<{ name: string; size?: 'sm' | 'lg' | 'xl' }>();
const body = computed(() => ICON_BODY[props.name] ?? '');
</script>

<template>
  <svg class="ink-icon" :class="[size, `i-${name}`]" viewBox="0 0 24 24" aria-hidden="true" focusable="false" v-html="body" />
</template>
