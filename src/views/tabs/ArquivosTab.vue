<script setup lang="ts">
import JsonPanel from '@/components/panels/JsonPanel.vue';
import PdfPanel from '@/components/panels/PdfPanel.vue';
import TabPage from './TabPage.vue';
</script>

<template>
  <TabPage title="PDFs e JSON">
    <PdfPanel />
    <JsonPanel />
  </TabPage>
</template>
