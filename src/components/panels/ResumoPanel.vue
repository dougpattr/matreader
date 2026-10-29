<script setup lang="ts">
/* Resumo: o que precisa ser visto sem rolar — número, situação, área,
   vértices, donos, ônus e o placar das conferências. */
import { computed } from 'vue';
import { useAppActions } from '@/app/actions';
import CountUp from '@/components/ink/CountUp.vue';
import EmptyState from '@/components/ink/EmptyState.vue';
import Icon from '@/components/ink/Icon.vue';
import Tile from '@/components/ink/Tile.vue';
import { fmt } from '@/core/format';
import { val } from '@/core/text';
import { useLibraryStore } from '@/stores/library';
import { useMatriculaStore } from '@/stores/matricula';

const mat = useMatriculaStore();
const lib = useLibraryStore();
const actions = useAppActions();

const d = computed(() => mat.data);
const g = computed(() => mat.summary);
const status = computed(() => {
  const s = String(d.value?.matricula.status_matricula ?? '').toLowerCase();
  if (!s) return { cls: 'chip--mute', text: 'situação não informada' };
  if (s.includes('ativ')) return { cls: 'chip--ok', text: d.value!.matricula.status_matricula! };
  if (/encerr|cancel/.test(s)) return { cls: 'chip--bad', text: d.value!.matricula.status_matricula! };
  return { cls: 'chip--mute', text: d.value!.matricula.status_matricula! };
});
const area = computed(() => {
  const dec = d.value?.imovel.area_total_m2 ?? NaN;
  const calc = g.value?.area ?? NaN;
  let note = 'declarada na matrícula';
  let warn = false;
  if (g.value && Number.isFinite(dec) && dec > 0) {
    const dif = (Math.abs(calc - dec) / dec) * 100;
    note = `calculada ${fmt(calc)} m² · ${fmt(dif, 1)}% de diferença`;
    warn = dif > 5;
  } else if (g.value) note = 'não declarada — calculada pela geometria';
  return { value: Number.isFinite(dec) ? dec : g.value ? calc : 0, note, warn };
});
const ativos = computed(() => (d.value?.onus_e_gravames ?? []).filter((o) => o.situacao !== 'cancelado'));
const donos = computed(() => d.value?.proprietarios_atuais ?? []);
const sub = computed(() => (d.value ? `${mat.stats.ok} de ${mat.stats.total} conferências ok` : 'conferência automática da extração'));
const local = computed(() => [d.value?.matricula.comarca, d.value?.matricula.uf].filter(Boolean).join('/'));

function seeChecks() {
  void actions.goTo('documento');
  setTimeout(() => document.getElementById('sec-verificacao')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 420);
}
</script>

<template>
  <Tile id="resumo" :index="3" title="Resumo" :sub="sub" picto="crystal" accent="mustard" style="--i: 2">
    <template #tools>
      <span v-if="lib.saveStatus.text" class="chip save-chip-tile" :class="`chip--${lib.saveStatus.kind || 'mute'}`">
        <Icon :name="lib.saveStatus.kind === 'ok' ? 'check' : 'info'" size="sm" />{{ lib.saveStatus.text }}
      </span>
    </template>

    <EmptyState v-if="!d" picto="crystal" title="Nenhuma matrícula aberta" text="Converta um PDF na Entrada, cole o JSON ou abra o exemplo para ver o resumo e as conferências.">
      <button type="button" class="btn btn--sm" @click="actions.loadDemo()">Ver o exemplo</button>
    </EmptyState>

    <template v-else>
      <div class="sum-top">
        <div class="sum-id">
          <div class="sum-num"><small>Nº</small>{{ d.matricula.numero ?? 'S/N' }}</div>
          <p class="sum-meta">
            {{ d.matricula.cartorio ?? 'cartório não informado' }}<template v-if="local"> · {{ local }}</template>
            <b v-if="val(d.imovel.denominacao)">{{ d.imovel.denominacao }}</b>
          </p>
        </div>
        <div class="sum-chips">
          <span v-if="mat.isDemo" class="chip chip--warn">exemplo</span>
          <span class="chip" :class="status.cls">{{ status.text }}</span>
          <span v-if="g" class="chip" :class="g.located ? 'chip--ok' : 'chip--warn'">{{ g.located ? 'georreferenciada' : 'falta posicionar' }}</span>
          <span v-else class="chip chip--mute">sem polígono</span>
        </div>
      </div>

      <div class="kpis">
        <div class="kpi" :class="{ warn: area.warn }">
          <b><CountUp :value="area.value" :dec="2" /></b>
          <span>m² de área</span>
          <small>{{ area.note }}</small>
        </div>
        <div class="kpi" :class="{ bad: g && !g.closes }">
          <b><CountUp :value="g?.vertices ?? 0" /></b>
          <span>vértices</span>
          <small>{{ g ? (g.gap === null ? 'coordenadas próprias' : g.closes ? `fecha com ${fmt(g.gap, 2)} m` : `não fecha: ${fmt(g.gap, 2)} m`) : 'sem geometria' }}</small>
        </div>
        <div class="kpi">
          <b><CountUp :value="donos.length" /></b>
          <span>proprietário(s)</span>
          <small>{{ donos.length ? (donos[0]?.nome ?? '').split(' ').slice(0, 3).join(' ') + (donos.length > 1 ? ' e outros' : '') : 'não identificado' }}</small>
        </div>
        <div class="kpi" :class="{ bad: ativos.length }">
          <b><CountUp :value="ativos.length" /></b>
          <span>ônus ativo(s)</span>
          <small>{{ ativos.length ? ativos.map((o) => o.tipo ?? 'ônus').slice(0, 2).join(', ') : d.onus_e_gravames.length ? 'todos cancelados' : 'nada extraído' }}</small>
        </div>
      </div>

      <button type="button" class="verify" @click="seeChecks">
        <Icon :name="mat.stats.problems.length ? 'alert' : 'check'" size="sm" :class="mat.stats.problems.length ? 'warn' : 'ok'" />
        <b>{{ mat.stats.ok }} de {{ mat.stats.total }} conferências</b>
        <span class="meter" aria-hidden="true"><i :style="{ width: `${mat.stats.pct}%` }" /></span>
        <span class="see">ver detalhes</span>
      </button>

      <div v-if="mat.stats.problems.length" class="alerts">
        <button
          v-for="p in mat.stats.problems.slice(0, 6)"
          :key="p.id"
          type="button"
          class="chip"
          :class="p.status === 'bad' ? 'chip--bad' : 'chip--warn'"
          :title="p.detail"
          @click="seeChecks"
        >
          <Icon name="alert" size="sm" />{{ p.label }}
        </button>
      </div>

      <div class="sum-actions">
        <button type="button" class="btn btn--sm" @click="actions.saveNow()"><Icon name="save" size="sm" />Salvar</button>
        <button type="button" class="btn btn--sm" @click="actions.copySummary()"><Icon name="copy" size="sm" />Copiar resumo</button>
        <button type="button" class="btn btn--sm" @click="actions.print()"><Icon name="print" size="sm" />Imprimir</button>
        <button type="button" class="btn btn--sm btn--quiet" @click="actions.newMatricula()"><Icon name="new" size="sm" />Nova</button>
      </div>
    </template>
  </Tile>
</template>

<style scoped>
.sum-top {
  display: flex;
  align-items: flex-start;
  gap: var(--s4);
  flex-wrap: wrap;
}
.sum-id {
  min-width: 0;
  flex: 1 1 220px;
}
.sum-num {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font: 700 clamp(28px, 3.4vw, 40px) / 1 var(--f-display);
  letter-spacing: -0.01em;
  color: var(--slate-2);
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.sum-num small {
  font: 700 13px/1 var(--f-ui);
  letter-spacing: 0.08em;
  color: var(--ink-3);
}
.sum-meta {
  margin-top: 6px;
  font-size: 12.5px;
  color: var(--ink-3);
  line-height: 1.45;
}
.sum-meta b {
  display: block;
  margin-top: 2px;
  color: var(--ink-2);
  font-weight: 600;
}
.sum-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}
.kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--s2);
}
@media (max-width: 1500px) and (min-width: 992px), (max-width: 560px) {
  .kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.kpi {
  min-width: 0;
  padding: var(--s3);
  border-radius: var(--r-sm);
  background: var(--paper-3);
  border: 1px solid var(--line);
}
.kpi b {
  display: block;
  font: 700 21px/1.1 var(--f-display);
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kpi span {
  display: block;
  margin-top: 4px;
  font: 700 10.5px/1.3 var(--f-ui);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.kpi small {
  display: block;
  margin-top: 4px;
  font-size: 11.5px;
  line-height: 1.35;
  color: var(--ink-3);
}
.kpi.warn b {
  color: var(--warn);
}
.kpi.bad b {
  color: var(--bad);
}
.verify {
  display: flex;
  align-items: center;
  gap: var(--s3);
  flex-wrap: wrap;
  width: 100%;
  padding: var(--s2) var(--s3);
  border-radius: var(--r-sm);
  border: 1px solid var(--line);
  background: var(--paper-3);
  font-size: 12.5px;
  cursor: pointer;
  text-align: left;
}
.verify:hover {
  border-color: var(--line-2);
}
.verify .ok {
  color: var(--ok);
}
.verify .warn {
  color: var(--warn);
}
.meter {
  flex: 1;
  min-width: 100px;
  height: 6px;
  border-radius: 99px;
  background: var(--paper-4);
  overflow: hidden;
}
.meter i {
  display: block;
  height: 100%;
  background: var(--ok);
  border-radius: 99px;
  transition: width var(--d3) var(--ease);
}
.see {
  color: var(--slate-2);
  font-weight: 600;
}
.alerts {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.sum-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s2);
}
.sum-actions > .btn {
  flex: 1 1 148px;
}
/* no desktop largo o selo de salvamento mora no cabeçalho */
@media (min-width: 1200px) {
  .save-chip-tile {
    display: none;
  }
}
</style>
