<script setup lang="ts">
/* Juntar PDFs: fila local (nada sai do aparelho), com miniaturas,
   reordenação por arraste (Ionic Reorder), limpeza de links e envio da
   fila inteira para a conversão por IA. */
import { IonItem, IonList, IonReorder, IonReorderGroup, IonToggle } from '@ionic/vue';
import { useAppActions } from '@/app/actions';
import Icon from '@/components/ink/Icon.vue';
import InkLoader from '@/components/ink/InkLoader.vue';
import Tile from '@/components/ink/Tile.vue';
import { toast } from '@/composables/useToast';
import { useDropZone } from '@/composables/useDropZone';
import { fmtBytes } from '@/core/format';
import { useFlowStore } from '@/stores/flow';
import { useQueueStore } from '@/stores/queue';
import { useSettingsStore } from '@/stores/settings';

const queue = useQueueStore();
const settings = useSettingsStore();
const flow = useFlowStore();
const actions = useAppActions();
const { over, bind } = useDropZone((files) => actions.addToQueue(files));

function onReorder(e: CustomEvent<{ from: number; to: number; complete: (data?: boolean | unknown[]) => unknown }>) {
  queue.items = e.detail.complete(queue.items) as typeof queue.items;
}
function remove(id: number, name: string) {
  const undo = queue.remove(id);
  void toast(`${name} saiu da fila.`, { action: 'Desfazer', onAction: undo });
}
function clearAll() {
  if (!queue.items.length) return;
  const undo = queue.clear();
  void toast('Fila esvaziada.', { action: 'Desfazer', onAction: undo });
}
</script>

<template>
  <Tile id="pdfs" :index="6" title="Juntar PDFs" sub="vários arquivos, um PDF só — no aparelho" picto="pages" accent="sage" style="--i: 5">
    <template #tools>
      <button type="button" class="ink-round sm ghost" aria-label="Esvaziar a fila" title="Esvaziar a fila" :disabled="!queue.items.length" @click="clearAll">
        <Icon name="trash" size="sm" />
      </button>
    </template>

    <div class="drop" :class="{ over }" v-bind="bind" data-cursor="Solte para juntar">
      <Icon name="arrow-down" />
      <span>Arraste PDFs e imagens aqui — pode misturar</span>
      <button type="button" class="plaque plaque--sm" @click="actions.addToQueuePicker()">Escolher arquivos</button>
    </div>

    <ion-list v-if="queue.items.length" class="rows" lines="none">
      <ion-reorder-group :disabled="false" @ion-item-reorder="onReorder">
        <ion-item v-for="(it, i) in queue.items" :key="it.id" class="row-item">
          <span class="thumb" aria-hidden="true">
            <img v-if="it.thumb" :src="it.thumb" alt="" />
            <span v-else>{{ it.kind === 'pdf' ? 'PDF' : 'IMG' }}</span>
          </span>
          <span class="row-main">
            <b>{{ i + 1 }}. {{ it.name }}</b>
            <small>{{ fmtBytes(it.size) }}{{ it.pages ? ` · ${it.pages} pág.` : '' }}</small>
          </span>
          <button type="button" class="ink-round sm ghost" :aria-label="`Subir ${it.name}`" :disabled="i === 0" @click="queue.move(it.id, -1)"><Icon name="up" size="sm" /></button>
          <button type="button" class="ink-round sm ghost" :aria-label="`Descer ${it.name}`" :disabled="i === queue.items.length - 1" @click="queue.move(it.id, 1)"><Icon name="down" size="sm" /></button>
          <button type="button" class="ink-round sm ghost" :aria-label="`Remover ${it.name}`" @click="remove(it.id, it.name)"><Icon name="x" size="sm" /></button>
          <ion-reorder slot="end" aria-label="Arraste para reordenar"><Icon name="grip" size="sm" /></ion-reorder>
        </ion-item>
      </ion-reorder-group>
    </ion-list>
    <p v-else class="muted center">A fila está vazia.</p>

    <label class="switch-row">
      <span class="grow">
        <b>Remover links e campos clicáveis</b>
        <span>Cada página vira imagem: some link, botão e formulário — em troca, o texto deixa de ser selecionável.</span>
      </span>
      <ion-toggle :checked="settings.removeLinks" aria-label="Remover links e campos clicáveis" @ion-change="settings.removeLinks = $event.detail.checked" />
    </label>

    <div v-if="queue.busy" class="stack">
      <InkLoader :progress="queue.progress" />
      <small class="muted">{{ queue.label }}</small>
    </div>

    <template #foot>
      <span class="grow muted small foot-note">
        <template v-if="queue.totals.count">{{ queue.totals.count }} arquivo(s) · {{ queue.totals.pages }}{{ queue.totals.unknown ? '+' : '' }} pág. · {{ fmtBytes(queue.totals.bytes) }}</template>
        <template v-else>Nenhum arquivo na fila</template>
      </span>
      <button type="button" class="plaque plaque--sm foot-btn" :disabled="!queue.items.length || flow.busy" @click="actions.convert(queue.files())"><Icon name="bolt" size="sm" />Converter com IA</button>
      <button type="button" class="plaque plaque--sm plaque--primary foot-btn" :disabled="!queue.items.length || queue.busy" @click="actions.generatePdf()">
        {{ queue.busy ? 'Processando…' : settings.removeLinks ? 'Gerar PDF limpo' : 'Gerar PDF' }}
      </button>
    </template>
  </Tile>
</template>

<style scoped>
.drop {
  display: grid;
  justify-items: center;
  gap: var(--s2);
  padding: var(--s4);
  border-radius: var(--r-md);
  border: 2px dashed var(--line-2);
  background: var(--paper-3) var(--hatch);
  color: var(--ink-3);
  text-align: center;
  font-size: 13px;
  transition:
    border-color var(--d2) var(--ease),
    background-color var(--d2) var(--ease);
}
.drop .ink-icon {
  color: var(--teal);
}
.drop.over {
  border-style: solid;
  border-color: var(--teal);
  background-color: var(--teal-soft);
}
.rows {
  display: block;
}
.row-item {
  --min-height: 56px;
  --background: var(--paper-3);
  --border-radius: var(--r-sm);
  margin-bottom: 6px;
  border-radius: var(--r-sm);
}
.thumb {
  display: grid;
  place-items: center;
  width: 32px;
  height: 40px;
  margin: 6px 10px 6px 8px;
  border-radius: 4px;
  overflow: hidden;
  background: var(--paper-4);
  font: 700 9px var(--f-ui);
  color: var(--ink-3);
  flex: none;
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.row-main {
  flex: 1;
  min-width: 0;
}
.row-main b {
  display: block;
  font-size: 13px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row-main small {
  font-size: 11.5px;
  color: var(--ink-3);
}
ion-reorder {
  padding: 0 8px;
}
.center {
  text-align: center;
  font-size: 13px;
}
@media (max-width: 560px) {
  .foot-note {
    flex-basis: 100%;
  }
  .foot-btn {
    flex: 1 1 0;
  }
}
.small {
  font-size: 12px;
}
</style>
