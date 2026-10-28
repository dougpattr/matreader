<script setup lang="ts">
/* Texto que aparece letra a letra, como as legendas do Nomadic Tribe.
   Leitores de tela recebem a frase inteira de uma vez (aria-label). */
import { computed } from 'vue';

const props = withDefaults(defineProps<{ text: string; speed?: number; tag?: string }>(), { speed: 18, tag: 'span' });
const letters = computed(() => Array.from(props.text));
</script>

<template>
  <component :is="tag" :key="text" class="reveal" :aria-label="text" role="text">
    <span
      v-for="(ch, i) in letters"
      :key="i"
      class="reveal-l"
      aria-hidden="true"
      :style="{ animationDelay: `${i * speed}ms` }"
      >{{ ch }}</span
    >
  </component>
</template>

<style scoped>
.reveal-l {
  opacity: 0;
  animation: letter-in 0.5s var(--ease) forwards;
  white-space: pre-wrap;
}
@keyframes letter-in {
  from {
    opacity: 0;
    filter: blur(2px);
  }
  to {
    opacity: 1;
    filter: none;
  }
}
</style>
