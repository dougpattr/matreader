<script setup lang="ts">
/* Acervo: toda matrícula com número fica guardada neste aparelho, com
   selo de estado, busca, ordenação, backup e planilha. No celular, deslize
   a linha para apagar; no desktop, segure a lixeira. */
import { IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonList, IonSegment, IonSegmentButton } from '@ionic/vue';
import { computed } from 'vue';
import { useAppActions } from '@/app/actions';
import EmptyState from '@/components/ink/EmptyState.vue';
import HoldButton from '@/components/ink/HoldButton.vue';
import Icon from '@/components/ink/Icon.vue';
import InkSelect from '@/components/ink/InkSelect.vue';
import type { InkOption } from '@/components/ink/ink-select';
import Tile from '@/components/ink/Tile.vue';
import { toast } from '@/composables/useToast';
import { pickFiles, ACCEPT_JSON } from '@/composables/useFilePicker';
import { timeAgo } from '@/core/format';
import type { LibraryRecord } from '@/services/library/library-db';
import { useLibraryStore, type LibraryFilter, type LibrarySort } from '@/stores/library';
import { useMatriculaStore } from '@/stores/matricula';
import { useUiStore } from '@/stores/ui';

const lib = useLibraryStore();
const mat = useMatriculaStore();
const ui = useUiStore();
const actions = useAppActions();

const BADGE: Record<string, { cls: string; text: string }> = {
  geo: { cls: 'chip--ok', text: 'georref.' },
  rascunho: { cls: 'chip--warn', text: 'rascunho' },
  sem: { cls: 'chip--mute', text: 'sem polígono' },
};
const SORTS: InkOption<LibrarySort>[] = [
  { value: 'recentes', label: 'Recentes' },
  { value: 'numero', label: 'Número' },
  { value: 'comarca', label: 'Comarca' },
];
const sub = computed(() => (lib.records.length ? `${lib.records.length} neste aparelho` : 'salva sozinha, neste aparelho'));

function open(r: LibraryRecord) {
  const res = lib.open(r);
  if (res.ok) {
    void toast(`Matrícula ${r.numero} aberta.`, { type: 'ok', ms: 2400 });
    void actions.goTo('documento');
  } else void toast(`Não consegui abrir: ${res.message}`, { type: 'erro' });
}
async function remove(r: LibraryRecord) {
  const undo = await lib.remove(r.id);
  void toast(`Matrícula ${r.numero} removida.`, { action: 'Desfazer', onAction: undo });
}
async function backup() {
  const n = await lib.exportBackup();
  void toast(n ? `Backup de ${n} matrícula(s) baixado.` : 'O acervo está vazio.', { type: n ? 'ok' : 'erro' });
}
async function restore() {
  const [f] = await pickFiles({ accept: ACCEPT_JSON });
  if (!f) return;
  try {
    const n = await lib.importBackup(f);
    void toast(`${n} matrícula(s) restaurada(s).`, { type: 'ok' });
  } catch (e) {
    void toast(`Backup inválido: ${(e as Error).message}`, { type: 'erro' });
  }
}
function csv() {
  const n = lib.exportCsv();
  void toast(n ? `Planilha com ${n} matrícula(s) baixada.` : 'Nada para exportar com esse filtro.', { type: n ? 'ok' : 'erro' });
}
</script>

<template>
  <Tile id="acervo" :index="7" title="Acervo" :sub="sub" picto="chest" accent="mustard" style="--i: 6">
    <template #tools>
      <button type="button" class="ink-round sm ghost" aria-label="Baixar planilha (CSV)" title="Planilha do acervo (CSV)" @click="csv"><Icon name="file" size="sm" /></button>
      <button type="button" class="ink-round sm ghost" aria-label="Baixar backup" title="Baixar backup de tudo" @click="backup"><Icon name="download" size="sm" /></button>
      <button type="button" class="ink-round sm ghost" aria-label="Restaurar backup" title="Restaurar um backup" @click="restore"><Icon name="upload" size="sm" /></button>
    </template>

    <label class="search-field">
      <Icon name="search" size="sm" />
      <input v-model="lib.query" class="input" type="search" placeholder="Número, nome, comarca, CPF…" aria-label="Buscar no acervo" />
    </label>
    <div class="filters">
      <ion-segment :value="lib.filter" scrollable aria-label="Filtrar por estado" @ion-change="lib.filter = $event.detail.value as LibraryFilter">
        <ion-segment-button value="todas">Todas {{ lib.counts.todas }}</ion-segment-button>
        <ion-segment-button value="geo">Georref. {{ lib.counts.geo }}</ion-segment-button>
        <ion-segment-button value="rascunho">Rascunho {{ lib.counts.rascunho }}</ion-segment-button>
        <ion-segment-button value="sem">Sem polígono {{ lib.counts.sem }}</ion-segment-button>
      </ion-segment>
      <InkSelect v-model="lib.sort" :options="SORTS" label="Ordenar o acervo" size="sm" class="sort" />
    </div>

    <EmptyState
      v-if="!lib.filtered.length"
      picto="flower"
      :title="lib.records.length ? 'Nada com esse filtro' : 'O acervo está vazio'"
      :text="lib.records.length ? 'Tente outro termo ou estado.' : 'A primeira matrícula com número entra sozinha — o exemplo nunca é salvo.'"
    />

    <ion-list v-else lines="none" class="lib-list">
      <ion-item-sliding v-for="r in lib.filtered" :key="r.id">
        <ion-item button :detail="false" class="lib-item" :class="{ current: r.id === mat.id }" @click="open(r)">
          <span class="lib-main">
            <b>Matrícula {{ r.numero }} <span class="chip" :class="BADGE[r.estado]?.cls">{{ BADGE[r.estado]?.text }}</span></b>
            <small>{{ [r.denominacao, r.comarca].filter(Boolean).join(' · ') || r.cartorio || '—' }} · {{ timeAgo(r.savedAt) }}</small>
          </span>
          <HoldButton v-if="ui.isDesktop" slot="end" compact :label="`Apagar matrícula ${r.numero}`" @click.stop @confirm="remove(r)" />
        </ion-item>
        <ion-item-options side="end">
          <ion-item-option color="danger" @click="remove(r)">Apagar</ion-item-option>
        </ion-item-options>
      </ion-item-sliding>
    </ion-list>
  </Tile>
</template>

<style scoped>
/* filtros e ordenação na mesma linha quando cabem; no celular a ordenação
   desce e fica à direita, e o segmento usa a largura toda */
.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s2);
  min-width: 0;
}
.filters ion-segment {
  flex: 1 1 260px;
  min-width: 0;
}
.filters ion-segment-button {
  min-width: max-content;
  font-size: 10.5px;
}
/* o InkSelect tem duas raízes (gatilho + lista): o escopo do pai só alcança via :deep */
.filters :deep(.sort) {
  flex: 0 0 136px;
  width: 136px;
  margin-left: auto;
}
.lib-list {
  display: grid;
  gap: 6px;
}
.lib-item {
  --background: var(--paper-3);
  --min-height: 60px;
  --padding-start: 12px;
  --inner-padding-end: 6px;
  border-radius: var(--r-sm);
  box-shadow: inset 0 0 0 1px var(--line);
}
.lib-item.current {
  --background: var(--slate-soft);
  box-shadow: inset 0 0 0 1.4px var(--slate);
}
.lib-main {
  flex: 1;
  min-width: 0;
  padding: 8px 0;
}
.lib-main b {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 13.5px;
  font-weight: 600;
}
.lib-main small {
  display: block;
  margin-top: 2px;
  font-size: 11.5px;
  color: var(--ink-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
