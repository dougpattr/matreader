<script setup lang="ts">
/* Entrada: a janela em arco onde a matrícula chega — PDF, fotos (câmera
   no celular), JSON colado ou o exemplo. */
import { computed, ref, watch } from 'vue';
import { useAppActions } from '@/app/actions';
import ArchWindow from '@/components/ink/ArchWindow.vue';
import Icon from '@/components/ink/Icon.vue';
import Tile from '@/components/ink/Tile.vue';
import { useDropZone } from '@/composables/useDropZone';
import { useFlowStore } from '@/stores/flow';
import { useModalsStore } from '@/stores/modals';
import { useUiStore } from '@/stores/ui';

const actions = useAppActions();
const flow = useFlowStore();
const ui = useUiStore();
const modals = useModalsStore();
const { over, bind } = useDropZone((files) => void actions.convert(files));

const flash = ref<'done' | 'error' | null>(null);
watch(
  () => flow.outcome,
  (o) => {
    flash.value = o === 'ok' ? 'done' : o === 'erro' ? 'error' : null;
    if (o) setTimeout(() => (flash.value = null), o === 'ok' ? 3200 : 6000);
  },
);

const state = computed(() => (flow.busy ? 'busy' : over.value || ui.dragging ? 'over' : (flash.value ?? 'idle')));
const title = computed(() =>
  flow.busy ? flow.label : state.value === 'over' ? 'Solte aqui para converter' : state.value === 'done' ? 'Matrícula recebida' : 'Solte a matrícula aqui',
);
const canCapture = navigator.maxTouchPoints > 0 || /Android|iPhone|iPad/i.test(navigator.userAgent);

function openPrompt() {
  modals.promptKind = 'completo';
  modals.prompt = true;
}
</script>

<template>
  <Tile id="entrada" :index="1" title="Entrada" sub="arraste, fotografe, cole ou abra" picto="feather" accent="rose" style="--i: 0">
    <div class="drop" v-bind="bind" data-cursor="Solte para converter">
      <ArchWindow :state="state">
        <p class="cartel" :class="{ busy: flow.busy }" aria-live="polite">
          <Icon :name="flow.busy ? 'clock' : 'arrow-down'" size="sm" />
          <span>{{ title }}</span>
        </p>
      </ArchWindow>
    </div>

    <div class="cta">
      <button type="button" class="plaque plaque--primary plaque--lg plaque--block" :disabled="flow.busy" @click="actions.pickAndConvert()">
        <Icon name="bolt" />Converter com IA
      </button>
      <small>PDF ou fotos — vários arquivos viram um documento só</small>
    </div>

    <div class="entry-actions">
      <button v-if="canCapture && !ui.isDesktop" type="button" class="plaque plaque--sm" @click="actions.photograph()">
        <Icon name="camera" size="sm" />Fotografar
      </button>
      <button type="button" class="plaque plaque--sm" @click="actions.pasteJson()"><Icon name="braces" size="sm" />Colar JSON</button>
      <button type="button" class="plaque plaque--sm" @click="actions.openJsonFile()"><Icon name="file" size="sm" />Abrir .json</button>
      <button type="button" class="plaque plaque--sm" @click="actions.loadDemo()"><Icon name="sparkle" size="sm" />Exemplo</button>
      <button type="button" class="plaque plaque--sm" @click="actions.copyPrompt('completo')"><Icon name="copy" size="sm" />Copiar prompt</button>
      <button type="button" class="plaque plaque--sm" @click="openPrompt"><Icon name="eye" size="sm" />Ver prompt</button>
    </div>

    <p class="privacy">
      <Icon name="shield" size="sm" />
      <span><b>Fica no aparelho:</b> documento, acervo, OCR e junção de PDFs. <b>Sai daqui:</b> o texto da matrícula vai ao seu fluxo do Power Automate, e o mapa busca imagens e endereços.</span>
    </p>
  </Tile>
</template>

<style scoped>
.drop {
  border-radius: var(--r-md);
}
/* cartel de papel no céu da janela (como o "↑ Drag" do Nomadic Tribe):
   a paisagem e o lote demarcado ficam inteiros à vista */
.drop :deep(.arch-overlay) {
  justify-content: flex-start;
  padding-top: 15%;
}
.cartel {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: calc(100% - 24px);
  padding: 7px 14px 8px;
  border-radius: 4px;
  background: var(--paper-2) var(--grain);
  box-shadow:
    0 0 0 1.6px var(--ink-stroke),
    3px 3px 0 0 rgba(30, 28, 36, 0.18);
  font: 700 11.5px/1.3 var(--f-ui);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink);
  transform: rotate(-1.2deg);
}
.cartel .ink-icon {
  flex: none;
  animation: nudge 1.6s var(--ease-in-out) infinite;
}
.cartel.busy .ink-icon {
  animation: none;
}
.cartel span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@keyframes nudge {
  50% {
    transform: translateY(3px);
  }
}
.cta {
  display: grid;
  justify-items: center;
  gap: 6px;
}
.cta small {
  font-size: 12px;
  color: var(--ink-3);
  text-align: center;
}
.entry-actions {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(124px, 1fr));
  gap: var(--s2);
}
.privacy {
  display: flex;
  gap: var(--s2);
  align-items: flex-start;
  font-size: 12px;
  line-height: 1.5;
  color: var(--ink-3);
}
.privacy .ink-icon {
  margin-top: 2px;
  color: var(--teal);
}
.privacy b {
  color: var(--ink-2);
}
@media (max-width: 420px) {
  .cta .plaque--lg {
    min-height: 48px;
    font-size: 14px;
  }
}
</style>
