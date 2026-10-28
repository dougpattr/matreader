<script setup lang="ts">
import Picto from './Picto.vue';

defineProps<{ picto: string; title: string; text?: string }>();
</script>

<template>
  <div class="empty">
    <Picto :name="picto" :size="52" draw />
    <b>{{ title }}</b>
    <p v-if="text">{{ text }}</p>
    <div v-if="$slots.default" class="empty-actions"><slot /></div>
  </div>
</template>

<style scoped>
.empty {
  display: grid;
  justify-items: center;
  gap: var(--s2);
  padding: var(--s6) var(--s4);
  text-align: center;
  color: var(--ink-3);
}
.empty :deep(.picto) {
  color: var(--slate);
  margin-bottom: var(--s1);
}
.empty b {
  color: var(--ink-2);
  font-size: var(--fs-lg);
  font-weight: 600;
}
.empty p {
  max-width: 40ch;
  font-size: 13px;
  line-height: 1.5;
}
.empty-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--s2);
  margin-top: var(--s2);
}
</style>
