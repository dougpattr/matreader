<script setup lang="ts">
/* Desktop: tudo numa página só (bento), sem abas escondendo conteúdo.
   Primeira fileira = o tríptico do Nomadic Tribe (Entrada no centro). */
import { onBeforeUnmount, onMounted } from 'vue';
import AcervoPanel from '@/components/panels/AcervoPanel.vue';
import DocumentoPanel from '@/components/panels/DocumentoPanel.vue';
import EntradaPanel from '@/components/panels/EntradaPanel.vue';
import JornadaPanel from '@/components/panels/JornadaPanel.vue';
import JsonPanel from '@/components/panels/JsonPanel.vue';
import PdfPanel from '@/components/panels/PdfPanel.vue';
import ResumoPanel from '@/components/panels/ResumoPanel.vue';
import TerrenoPanel from '@/components/panels/TerrenoPanel.vue';
import { useUiStore, type PanelId } from '@/stores/ui';

const ui = useUiStore();
let spy: IntersectionObserver | null = null;

onMounted(() => {
  spy = new IntersectionObserver(
    (entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      const id = (vis?.target as HTMLElement | undefined)?.dataset.panel as PanelId | undefined;
      if (id && Date.now() > ui.spyPauseUntil) ui.activePanel = id;
    },
    { rootMargin: '-25% 0px -55% 0px', threshold: [0, 0.25, 0.5] },
  );
  document.querySelectorAll<HTMLElement>('.bento [data-panel]').forEach((el) => spy!.observe(el));
});
onBeforeUnmount(() => spy?.disconnect());
</script>

<template>
  <main class="bento" :class="{ veiled: !!ui.focusPanel }">
    <ResumoPanel class="a-sum" />
    <EntradaPanel class="a-ent" />
    <JornadaPanel class="a-jor" />
    <TerrenoPanel class="a-ter" />
    <DocumentoPanel class="a-doc" />
    <PdfPanel class="a-pdf" />
    <AcervoPanel class="a-acv" />
    <JsonPanel class="a-jsn" />
    <div v-if="ui.focusPanel" class="veil" aria-hidden="true" @click="ui.focusPanel = null" />
  </main>
</template>

<style scoped>
.bento {
  display: grid;
  gap: var(--gutter);
  /* o cabeçalho flutua por cima: o conteúdo começa abaixo dele, com folga */
  padding: calc(var(--float-top) + 6px) var(--gutter) calc(var(--s8) + var(--safe-bottom));
  max-width: 1760px;
  margin: 0 auto;
  align-items: stretch;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  grid-template-areas:
    'sum sum sum sum ent ent ent ent jor jor jor jor'
    'ter ter ter ter ter ter ter doc doc doc doc doc'
    'pdf pdf pdf pdf acv acv acv acv jsn jsn jsn jsn';
}
.a-sum {
  grid-area: sum;
}
.a-ent {
  grid-area: ent;
}
.a-jor {
  grid-area: jor;
}
.a-ter {
  grid-area: ter;
}
.a-doc {
  grid-area: doc;
}
.a-pdf {
  grid-area: pdf;
}
.a-acv {
  grid-area: acv;
}
.a-jsn {
  grid-area: jsn;
}
.bento :deep(.a-doc .tile-body) {
  max-height: clamp(520px, 66vh, 900px);
}
.bento :deep(.a-pdf .tile-body),
.bento :deep(.a-acv .tile-body),
.bento :deep(.a-jsn .tile-body) {
  max-height: 440px;
}
.bento :deep(.a-sum .tile-body),
.bento :deep(.a-jor .tile-body) {
  max-height: 560px;
}
@media (max-width: 1199px) {
  .bento {
    grid-template-areas:
      'ent ent ent ent ent ent jor jor jor jor jor jor'
      'sum sum sum sum sum sum sum sum sum sum sum sum'
      'ter ter ter ter ter ter ter ter ter ter ter ter'
      'doc doc doc doc doc doc doc doc doc doc doc doc'
      'pdf pdf pdf pdf pdf pdf acv acv acv acv acv acv'
      'jsn jsn jsn jsn jsn jsn jsn jsn jsn jsn jsn jsn';
  }
}
.veil {
  position: fixed;
  inset: 0;
  z-index: 55;
  background: rgba(20, 18, 28, 0.55);
  backdrop-filter: blur(3px);
  animation: veil-in var(--d2) var(--ease);
}
@keyframes veil-in {
  from {
    opacity: 0;
  }
}
</style>
