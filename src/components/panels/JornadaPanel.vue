<script setup lang="ts">
/* Jornada: o caminho da matrícula até o agente e de volta — estado da
   conexão com o fluxo, progresso por estação, legendas e histórico. */
import { computed } from 'vue';
import { useAppActions } from '@/app/actions';
import Icon from '@/components/ink/Icon.vue';
import JourneyPath from '@/components/ink/JourneyPath.vue';
import LetterReveal from '@/components/ink/LetterReveal.vue';
import Tile from '@/components/ink/Tile.vue';
import { fmtClock, fmtDuration, fmtInt, timeAgo } from '@/core/format';
import { METHOD_LABEL, type TextMethod } from '@/services/extract/text-extraction';
import { STAGES, useFlowStore } from '@/stores/flow';
import { useModalsStore } from '@/stores/modals';
import { useSettingsStore } from '@/stores/settings';

const flow = useFlowStore();
const settings = useSettingsStore();
const modals = useModalsStore();
const actions = useAppActions();

const connection = computed(() => {
  if (!settings.flowConfigured) return { chip: 'chip--warn', text: 'fluxo não configurado' };
  if (flow.ping.error) return { chip: 'chip--bad', text: 'teste falhou' };
  if (settings.flowContract === 'v2') return { chip: 'chip--ok', text: 'scope MatReader' };
  if (settings.flowContract === 'v1') return { chip: 'chip--info', text: 'fluxo antigo' };
  return { chip: 'chip--mute', text: 'fluxo configurado' };
});

const sub = computed(() => (flow.busy ? `${flow.label}` : flow.history[0] ? `última conversão ${timeAgo(flow.history[0].at)}` : 'do arquivo ao documento conferido'));
const methodLabel = (m: string) => METHOD_LABEL[m as TextMethod] ?? m;
const recent = computed(() => flow.history.slice(0, 4));
</script>

<template>
  <Tile id="jornada" :index="2" title="Jornada" :sub="sub" picto="bird" accent="sky" style="--i: 1">
    <template #tools>
      <button type="button" class="ink-round sm ghost" aria-label="Configurar o fluxo" title="Configurar o fluxo" @click="modals.settings = true">
        <Icon name="gear" size="sm" />
      </button>
    </template>

    <div class="status">
      <span class="chip" :class="connection.chip"><Icon name="plug" size="sm" />{{ connection.text }}</span>
      <span v-if="flow.ping.result" class="muted small">respondeu em {{ flow.ping.result.ms }} ms {{ timeAgo(flow.ping.at) }}</span>
      <button
        type="button"
        class="plaque plaque--sm"
        :disabled="!settings.flowConfigured || flow.ping.busy || flow.busy"
        @click="actions.testConnection()"
      >
        <Icon name="refresh" size="sm" />{{ flow.ping.busy ? 'Testando…' : 'Testar conexão' }}
      </button>
    </div>

    <JourneyPath :stages="STAGES" :current="flow.stageIndex" :progress="flow.progress" :outcome="flow.outcome" :busy="flow.busy" />

    <div v-if="flow.busy" class="run" aria-live="polite">
      <div class="subtitle">
        <LetterReveal :text="flow.phrase" />
      </div>
      <div class="run-row">
        <span class="mono">{{ fmtClock(flow.elapsed) }}</span>
        <span class="grow muted small">{{ flow.label }}</span>
        <button type="button" class="plaque plaque--sm plaque--danger" @click="flow.cancel()">Cancelar</button>
      </div>
    </div>

    <div v-else-if="flow.outcome" class="result" :class="flow.outcome" aria-live="polite">
      <Icon :name="flow.outcome === 'ok' ? 'check' : 'alert'" />
      <div class="grow">
        <b>{{ flow.outcome === 'ok' ? flow.label : flow.error?.message }}</b>
        <span v-if="flow.outcome === 'erro' && (flow.error?.detail || flow.error?.hint)">{{ [flow.error?.detail, flow.error?.hint].filter(Boolean).join(' — ') }}</span>
        <span v-else-if="flow.outcome === 'ok'">em {{ fmtDuration(flow.elapsed) }}</span>
      </div>
      <button type="button" class="ink-round sm ghost" aria-label="Dispensar" @click="flow.dismiss()"><Icon name="x" size="sm" /></button>
    </div>

    <dl v-if="flow.extracted" class="facts-mini">
      <div><dt>Páginas</dt><dd>{{ flow.extracted.pages }}</dd></div>
      <div><dt>Texto</dt><dd>{{ methodLabel(flow.extracted.method) }}</dd></div>
      <div><dt>Caracteres</dt><dd>{{ fmtInt(flow.extracted.chars) }}</dd></div>
      <div v-if="flow.extracted.ocrConfidence !== null"><dt>OCR</dt><dd>{{ flow.extracted.ocrConfidence }}% de confiança</dd></div>
    </dl>
    <div v-if="flow.lastText || flow.lastRaw" class="row">
      <button v-if="flow.lastText" type="button" class="plaque plaque--sm plaque--ghost" @click="actions.showLastText()"><Icon name="doc" size="sm" />Texto enviado</button>
      <button v-if="flow.lastRaw" type="button" class="plaque plaque--sm plaque--ghost" @click="actions.showLastResponse()"><Icon name="braces" size="sm" />Resposta do agente</button>
    </div>

    <div v-if="recent.length" class="history">
      <p class="eyebrow">Últimas conversões</p>
      <ul>
        <li v-for="r in recent" :key="r.id" :class="{ fail: !r.ok }">
          <Icon :name="r.ok ? 'check' : 'alert'" size="sm" />
          <span class="grow">
            <b>{{ r.numero ? `Matrícula ${r.numero}` : r.file }}</b>
            <small>{{ timeAgo(r.at) }} · {{ fmtDuration(r.ms) }} · {{ r.pages }} pág. · {{ methodLabel(r.method) }}{{ r.ok ? '' : ` · ${r.message}` }}</small>
          </span>
        </li>
      </ul>
    </div>

    <div v-if="!flow.busy && !flow.outcome && !recent.length" class="guide">
      <p class="eyebrow">{{ settings.flowConfigured ? 'Pronto para a primeira viagem' : 'Conecte o seu agente' }}</p>
      <ol>
        <li :class="{ done: settings.flowConfigured }"><b>Fluxo</b> — gatilho HTTP + o scope do MatReader no Power Automate.</li>
        <li :class="{ done: settings.flowConfigured }"><b>URL</b> — cole o endereço do gatilho em Configurações.</li>
        <li :class="{ done: !!flow.ping.result }"><b>Teste</b> — "Testar conexão" responde na hora, sem gastar o agente.</li>
        <li><b>Converta</b> — solte o PDF na Entrada; o texto (ou OCR) segue a trilha acima.</li>
      </ol>
      <button v-if="!settings.flowConfigured" type="button" class="plaque plaque--sm plaque--primary" @click="modals.settings = true">
        <Icon name="plug" size="sm" />Configurar o fluxo
      </button>
    </div>
  </Tile>
</template>

<style scoped>
.guide {
  display: grid;
  gap: var(--s3);
  justify-items: start;
  padding: var(--s3) var(--s4);
  border-radius: var(--r-md);
  background: var(--paper-3) var(--hatch);
  box-shadow: inset 0 0 0 1px var(--line);
}
.guide ol {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: var(--s2);
  counter-reset: passo;
  font-size: 13px;
  color: var(--ink-2);
}
.guide li {
  position: relative;
  padding-left: 32px;
  counter-increment: passo;
  line-height: 1.45;
}
.guide li::before {
  content: counter(passo);
  position: absolute;
  left: 0;
  top: -1px;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1.4px solid var(--ink-stroke);
  background: var(--paper-2);
  font: 700 11px/1 var(--f-display);
  color: var(--slate-2);
}
.guide li.done::before {
  content: '✓';
  background: var(--ok-soft);
  border-color: var(--ok);
  color: var(--ok);
}
.guide b {
  color: var(--ink);
}
.status {
  display: flex;
  align-items: center;
  gap: var(--s2);
  flex-wrap: wrap;
}
.status .plaque {
  margin-left: auto;
}
.small {
  font-size: 12px;
}
.run {
  display: grid;
  gap: var(--s2);
}
.subtitle {
  position: relative;
  padding: var(--s3) var(--s4);
  border-radius: 6px;
  background: var(--paper-3) var(--grain);
  box-shadow: 0 0 0 1.3px var(--ink-stroke);
  font-size: 13.5px;
  line-height: 1.5;
  min-height: 48px;
  clip-path: polygon(0 4%, 3% 0, 97% 2%, 100% 0, 99% 96%, 100% 100%, 2% 98%, 0 100%);
}
.run-row {
  display: flex;
  align-items: center;
  gap: var(--s3);
}
.result {
  display: flex;
  gap: var(--s3);
  align-items: flex-start;
  padding: var(--s3);
  border-radius: var(--r-md);
  font-size: 13px;
}
.result b {
  display: block;
  font-weight: 600;
}
.result span {
  display: block;
  color: var(--ink-3);
  font-size: 12.5px;
  margin-top: 2px;
}
.result.ok {
  background: var(--ok-soft);
  color: var(--ok);
}
.result.erro {
  background: var(--bad-soft);
  color: var(--bad);
}
.result.ok b,
.result.erro b {
  color: var(--ink);
}
.facts-mini {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--s2) var(--s4);
  margin: 0;
}
.facts-mini dt {
  font: 700 10.5px/1.3 var(--f-ui);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.facts-mini dd {
  margin: 2px 0 0;
  font-size: 13px;
}
.history ul {
  list-style: none;
  margin: var(--s2) 0 0;
  padding: 0;
  display: grid;
  gap: 6px;
}
.history li {
  display: flex;
  gap: var(--s2);
  align-items: flex-start;
  padding: var(--s2) var(--s3);
  border-radius: var(--r-sm);
  background: var(--paper-3);
  color: var(--ok);
}
.history li.fail {
  color: var(--bad);
}
.history b {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}
.history small {
  display: block;
  font-size: 11.5px;
  color: var(--ink-3);
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
