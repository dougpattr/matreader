<script setup lang="ts">
/* Moldura comum das abas no celular: cabeçalho e conteúdo rolável. */
import { IonContent, IonPage } from '@ionic/vue';
import AppHeader from '@/components/layout/AppHeader.vue';

defineProps<{ title: string; full?: boolean }>();
</script>

<template>
  <ion-page>
    <AppHeader :title="title" />
    <ion-content>
      <div class="tab-stack" :class="{ full }">
        <slot />
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.tab-stack {
  display: grid;
  gap: var(--gutter);
  padding: var(--gutter) var(--gutter) calc(var(--gutter) * 2);
  max-width: 820px;
  margin: 0 auto;
}
.tab-stack.full {
  max-width: none;
}
</style>
