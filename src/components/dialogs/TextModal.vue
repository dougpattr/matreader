<script setup lang="ts">
/* Mostra um texto longo (o que foi enviado ao agente ou a resposta crua)
   com copiar e baixar. */
import Icon from '@/components/ink/Icon.vue';
import InkSheet from '@/components/ink/InkSheet.vue';
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
  <InkSheet :open="!!modals.text" :title="modals.text?.title ?? ''" :sub="`${modals.text?.subtitle ?? ''} · ${fmtInt(modals.text?.text.length ?? 0)} caracteres`" icon="doc" @close="modals.text = null">
    <pre class="textbox">{{ modals.text?.text }}</pre>
    <template #foot>
      <button type="button" class="btn btn--sm" @click="save"><Icon name="download" size="sm" />Baixar</button>
      <button type="button" class="btn btn--sm btn--primary" @click="copy"><Icon name="copy" size="sm" />Copiar</button>
    </template>
  </InkSheet>
</template>

<style scoped>
.textbox {
  margin: 0;
  padding: 18px 20px;
  border-radius: var(--r-md);
  background: var(--paper-3);
  box-shadow: inset 0 0 0 1px var(--line-2);
  font: 400 12px/1.6 var(--f-mono);
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--ink-2);
}
</style>
