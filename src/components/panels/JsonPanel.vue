<script setup lang="ts">
/* Editor JSON: o que a IA devolveu, editável. Cada mudança é relida pelo
   leitor tolerante e o documento remonta sozinho. */
import { ref } from 'vue';
import { useAppActions } from '@/app/actions';
import Icon from '@/components/ink/Icon.vue';
import Tile from '@/components/ink/Tile.vue';
import { copyText, debounce } from '@/core/browser';
import { toast } from '@/composables/useToast';
import { useMatriculaStore } from '@/stores/matricula';

const mat = useMatriculaStore();
const actions = useAppActions();
const local = ref(mat.editorText);
let editing = false;

mat.$subscribe(() => {
  if (!editing) local.value = mat.editorText;
});

const reparse = debounce((text: string) => {
  editing = false;
  if (text.trim().length < 12) return;
  mat.loadText(text, { source: 'editor', reformat: false });
}, 700);

function onInput(e: Event) {
  editing = true;
  local.value = (e.target as HTMLTextAreaElement).value;
  mat.editorStatus = { kind: 'info', text: 'Lendo…' };
  reparse(local.value);
}
function format() {
  if (!local.value.trim()) return;
  const r = mat.loadText(local.value, { source: 'editor', reformat: true });
  void toast(r.ok ? 'JSON reindentado.' : `Não consegui ler: ${r.message}`, { type: r.ok ? 'ok' : 'erro', ms: 2400 });
}
async function copy() {
  const ok = await copyText(local.value);
  void toast(ok ? 'JSON copiado.' : 'Não consegui copiar.', { type: ok ? 'ok' : 'erro', ms: 2200 });
}
</script>

<template>
  <Tile id="json" :index="8" title="Editor JSON" sub="o que a IA devolveu, editável" picto="vine" accent="slate" expandable style="--i: 7">
    <template #tools>
      <button type="button" class="ink-round sm ghost" aria-label="Formatar (reindentar) o JSON" title="Formatar" @click="format"><Icon name="indent" size="sm" /></button>
      <button type="button" class="ink-round sm ghost" aria-label="Colar da área de transferência" title="Colar" @click="actions.pasteJson()"><Icon name="braces" size="sm" /></button>
      <button type="button" class="ink-round sm ghost" aria-label="Copiar o JSON" title="Copiar" @click="copy"><Icon name="copy" size="sm" /></button>
    </template>
    <div class="editor">
      <label class="sr-only" for="json-editor">JSON da matrícula</label>
      <textarea
        id="json-editor"
        class="input scroll"
        :value="local"
        spellcheck="false"
        autocomplete="off"
        placeholder="Cole aqui o bloco JSON que a IA devolveu. O documento monta sozinho."
        @input="onInput"
      />
      <p class="status" :class="mat.editorStatus.kind" aria-live="polite">
        <Icon :name="mat.editorStatus.kind === 'ok' ? 'check' : mat.editorStatus.kind === 'err' ? 'alert' : 'info'" size="sm" />
        <span>{{ mat.editorStatus.text }}</span>
      </p>
    </div>
  </Tile>
</template>

<style scoped>
.editor {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
textarea {
  flex: 1;
  min-height: 220px;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  resize: vertical;
  tab-size: 2;
}
.status {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--line-2);
  border-top: 0;
  border-radius: 0 0 var(--r-sm) var(--r-sm);
  background: var(--paper-3);
  font-size: 12px;
  color: var(--ink-3);
}
.status.ok {
  color: var(--ok);
}
.status.err {
  color: var(--bad);
}
</style>
