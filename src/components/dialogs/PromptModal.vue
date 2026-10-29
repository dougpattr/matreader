<script setup lang="ts">
import { IonSegment, IonSegmentButton } from '@ionic/vue';
import { computed } from 'vue';
import { useAppActions } from '@/app/actions';
import Icon from '@/components/ink/Icon.vue';
import InkSheet from '@/components/ink/InkSheet.vue';
import { fmt } from '@/core/format';
import { PROMPTS, type PromptKind } from '@/domain/prompts';
import { useModalsStore } from '@/stores/modals';

const modals = useModalsStore();
const actions = useAppActions();
const p = computed(() => PROMPTS[modals.promptKind]);
</script>

<template>
  <InkSheet :open="modals.prompt" title="Prompt de extração" sub="Para usar a matrícula numa IA sem o fluxo." icon="sparkle" @close="modals.prompt = false">
    <p class="lead">Cole numa IA junto com o PDF ou as fotos. Ele manda a IA raciocinar por etapas (CoT) e <b>verificar o próprio resultado relendo o documento</b> (CoVe), devolvendo as conferências dentro do JSON.</p>
    <ion-segment :value="modals.promptKind" aria-label="Versão do prompt" @ion-change="modals.promptKind = $event.detail.value as PromptKind">
      <ion-segment-button v-for="(v, k) in PROMPTS" :key="k" :value="k">{{ v.title }}</ion-segment-button>
    </ion-segment>
    <pre class="promptbox scroll">{{ p.text }}</pre>
    <template #foot>
      <span class="muted size">{{ fmt(p.text.length / 1024, 1) }} KB · {{ p.hint }}</span>
      <button type="button" class="btn btn--sm btn--primary" @click="actions.copyPrompt(modals.promptKind)"><Icon name="copy" size="sm" />Copiar</button>
    </template>
  </InkSheet>
</template>

<style scoped>
.lead {
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--ink-2);
}
.promptbox {
  margin: 0;
  max-height: none;
  padding: 18px 20px;
  border-radius: var(--r-md);
  background: var(--paper-3);
  box-shadow: inset 0 0 0 1px var(--line-2);
  font: 400 11.5px/1.6 var(--f-mono);
  white-space: pre-wrap;
  color: var(--ink-2);
}
.size {
  margin-right: auto;
  font-size: 12px;
}
</style>
