<script setup lang="ts">
/* Mostra um texto longo (o que foi enviado ao agente ou a resposta crua)
   com copiar e baixar. */
import { IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonModal, IonTitle, IonToolbar } from '@ionic/vue';
import Icon from '@/components/ink/Icon.vue';
import { copyText, download } from '@/core/browser';
import { fmtInt } from '@/core/format';
import { toast } from '@/composables/useToast';
import { useModalsStore } from '@/stores/modals';

const modals = useModalsStore();

async function copy() {
  const ok = await copyText(modals.text?.text ?? '');
  void toast(ok ? 'Copiado.' : 'Não consegui copiar.', { type: ok ? 'ok' : 'erro', ms: 2200 });
}
function save() {
  if (modals.text) download(modals.text.text, modals.text.filename, 'text/plain;charset=utf-8');
}
</script>

<template>
  <ion-modal class="ink-modal" :is-open="!!modals.text" @did-dismiss="modals.text = null">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ modals.text?.title }}</ion-title>
        <ion-buttons slot="end">
          <ion-button aria-label="Fechar" @click="modals.text = null"><Icon name="x" /></ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p class="muted sub">{{ modals.text?.subtitle }} · {{ fmtInt(modals.text?.text.length ?? 0) }} caracteres</p>
      <pre class="textbox">{{ modals.text?.text }}</pre>
    </ion-content>
    <ion-footer>
      <ion-toolbar>
        <ion-buttons slot="end">
          <button type="button" class="plaque plaque--sm" @click="save"><Icon name="download" size="sm" />Baixar</button>
          <button type="button" class="plaque plaque--sm plaque--primary" @click="copy"><Icon name="copy" size="sm" />Copiar</button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-modal>
</template>

<style scoped>
.sub {
  margin-bottom: var(--s3);
  font-size: 12.5px;
}
.textbox {
  margin: 0;
  padding: var(--s4);
  border-radius: var(--r-sm);
  background: var(--paper-3);
  box-shadow: inset 0 0 0 1px var(--line-2);
  font: 400 12px/1.6 var(--f-mono);
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--ink-2);
}
ion-buttons .plaque {
  margin-left: 8px;
}
</style>
