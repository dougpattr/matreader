<script setup lang="ts">
import EntradaPanel from '@/components/panels/EntradaPanel.vue';
import JornadaPanel from '@/components/panels/JornadaPanel.vue';
import ResumoPanel from '@/components/panels/ResumoPanel.vue';
import TabPage from './TabPage.vue';
</script>

<template>
  <TabPage title="Entrada e jornada">
    <EntradaPanel />
    <JornadaPanel />
    <ResumoPanel />
  </TabPage>
</template>
