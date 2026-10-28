<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonModal, IonSegment, IonSegmentButton, IonTitle, IonToolbar } from '@ionic/vue';
import { computed } from 'vue';
import { useAppActions } from '@/app/actions';
import Icon from '@/components/ink/Icon.vue';
import { fmt } from '@/core/format';
import { PROMPTS, type PromptKind } from '@/domain/prompts';
import { useModalsStore } from '@/stores/modals';

const modals = useModalsStore();
const actions = useAppActions();
const p = computed(() => PROMPTS[modals.promptKind]);
</script>

<template>
  <ion-modal class="ink-modal" :is-open="modals.prompt" @did-dismiss="modals.prompt = false">
    <ion-header>
      <ion-toolbar>
        <ion-title>Prompt de extração</ion-title>
        <ion-buttons slot="end">
          <ion-button aria-label="Fechar" @click="modals.prompt = false"><Icon name="x" /></ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p class="lead">Cole numa IA junto com o PDF ou as fotos. Ele manda a IA raciocinar por etapas (CoT) e <b>verificar o próprio resultado relendo o documento</b> (CoVe), devolvendo as conferências dentro do JSON.</p>
      <ion-segment :value="modals.promptKind" aria-label="Versão do prompt" @ion-change="modals.promptKind = $event.detail.value as PromptKind">
        <ion-segment-button v-for="(v, k) in PROMPTS" :key="k" :value="k">{{ v.title }}</ion-segment-button>
      </ion-segment>
      <pre class="promptbox scroll">{{ p.text }}</pre>
    </ion-content>
    <ion-footer>
      <ion-toolbar>
        <span slot="start" class="muted size">{{ fmt(p.text.length / 1024, 1) }} KB · {{ p.hint }}</span>
        <ion-buttons slot="end">
          <button type="button" class="plaque plaque--sm plaque--primary" @click="actions.copyPrompt(modals.promptKind)"><Icon name="copy" size="sm" />Copiar</button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-modal>
</template>

<style scoped>
.lead {
  margin-bottom: var(--s3);
  font-size: 13.5px;
  color: var(--ink-2);
}
ion-segment {
  margin-bottom: var(--s3);
}
.promptbox {
  margin: 0;
  max-height: none;
  padding: var(--s4);
  border-radius: var(--r-sm);
  background: var(--paper-3);
  box-shadow: inset 0 0 0 1px var(--line-2);
  font: 400 11.5px/1.6 var(--f-mono);
  white-space: pre-wrap;
  color: var(--ink-2);
}
.size {
  padding-left: var(--s3);
  font-size: 12px;
}
</style>
