<script setup lang="ts">
/* Configurações: fluxo do Power Automate (com teste), leitura do PDF,
   aparência, acervo e uso offline — um cartão por assunto, com respiro. */
import { IonSegment, IonSegmentButton, IonToggle } from '@ionic/vue';
import { computed, onMounted, ref, watch } from 'vue';
import { useAppActions } from '@/app/actions';
import HoldButton from '@/components/ink/HoldButton.vue';
import Icon from '@/components/ink/Icon.vue';
import InkSelect from '@/components/ink/InkSelect.vue';
import InkSheet from '@/components/ink/InkSheet.vue';
import type { InkOption } from '@/components/ink/ink-select';
import { toast } from '@/composables/useToast';
import { fmtBytes } from '@/core/format';
import { APP_VERSION, CONTRACT } from '@/services/flow/flow-client';
import { offlineCacheStatus, prepareOffline, storageEstimate } from '@/services/pwa';
import { useFlowStore } from '@/stores/flow';
import { useLibraryStore } from '@/stores/library';
import { useMatriculaStore } from '@/stores/matricula';
import { useModalsStore } from '@/stores/modals';
import { useSettingsStore, type SendPdfMode, type ThemeMode } from '@/stores/settings';
import { useUiStore } from '@/stores/ui';
import type { OcrMode } from '@/services/extract/text-extraction';

const modals = useModalsStore();
const settings = useSettingsStore();
const flow = useFlowStore();
const lib = useLibraryStore();
const mat = useMatriculaStore();
const ui = useUiStore();
const actions = useAppActions();

const OCR_OPTIONS: InkOption<OcrMode>[] = [
  { value: 'auto', label: 'Automático', hint: 'só nas páginas sem texto' },
  { value: 'sempre', label: 'Sempre', hint: 'ignora o texto do PDF' },
  { value: 'nunca', label: 'Nunca' },
];
const PDF_OPTIONS: InkOption<SendPdfMode>[] = [
  { value: 'auto', label: 'Automático', hint: 'só para o fluxo antigo' },
  { value: 'sempre', label: 'Sempre' },
  { value: 'nunca', label: 'Nunca' },
];
// o agente pode levar minutos; o scope espera até 20 min por ele
const TIMEOUT_OPTIONS: InkOption<number>[] = [
  { value: 5, label: '5 minutos' },
  { value: 10, label: '10 minutos', hint: 'recomendado' },
  { value: 15, label: '15 minutos' },
  { value: 20, label: '20 minutos', hint: 'o máximo do scope' },
];

const showUrl = ref(false);
const url = ref(settings.flowUrl);
const offline = ref<{ cached: number; total: number } | null>(null);
const usage = ref<{ usage: number; quota: number } | null>(null);
const preparing = ref(false);

const pingChip = computed(() => {
  const r = flow.ping.result;
  if (!r) return '';
  const what = r.envelope ? `scope ${r.versao ?? 'MatReader'}` : 'fluxo antigo';
  return `${what}${r.modo === 'tarefa' ? ' · por tarefa' : ''} · ${r.ms} ms`;
});

watch(
  () => modals.settings,
  async (open) => {
    if (!open) return;
    url.value = settings.flowUrl;
    offline.value = await offlineCacheStatus();
    usage.value = await storageEstimate();
  },
);
onMounted(async () => (usage.value = await storageEstimate()));

function saveUrl() {
  const v = url.value.trim();
  if (v === settings.flowUrl) return;
  if (v && !/^https:\/\//i.test(v) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(v)) {
    return void toast('A URL do fluxo precisa começar com https://', { type: 'erro' });
  }
  settings.flowUrl = v;
  settings.flowContract = null;
  void toast(v ? 'URL do fluxo salva neste aparelho.' : 'URL do fluxo removida.', { type: 'ok', ms: 2600 });
}
async function test() {
  saveUrl();
  await actions.testConnection();
}
async function prepare() {
  preparing.value = true;
  const r = await prepareOffline((done, total) => (offline.value = { cached: done, total }));
  preparing.value = false;
  offline.value = await offlineCacheStatus();
  usage.value = await storageEstimate();
  void toast(
    r.ok === r.total ? `Pronto para uso offline (OCR e PDF)${r.persisted ? ' — armazenamento protegido' : ''}.` : `${r.ok} de ${r.total} recursos baixados — tente de novo com internet.`,
    { type: r.ok === r.total ? 'ok' : 'erro' },
  );
}
async function wipe() {
  const undo = await lib.removeAll();
  mat.clear();
  void toast('Acervo apagado deste aparelho.', { action: 'Desfazer', onAction: undo, ms: 9000 });
}
</script>

<template>
  <InkSheet :open="modals.settings" title="Configurações" sub="Fluxo do agente, leitura do PDF, aparência e dados — tudo fica neste aparelho." icon="gear" @close="modals.settings = false">
    <section class="sheet-card">
      <header class="sheet-card-head">
        <span class="mark"><Icon name="plug" /></span>
        <div>
          <h3>Fluxo do Power Automate</h3>
          <p>O gatilho HTTP que leva o texto da matrícula ao agente do Copilot Studio e traz o JSON de volta.</p>
        </div>
      </header>

      <div class="field">
        <label for="flow-url">Endereço do gatilho HTTP</label>
        <div class="url-row">
          <input id="flow-url" v-model="url" class="input mono" :type="showUrl ? 'text' : 'password'" placeholder="https://…/workflows/…/triggers/manual/paths/invoke?…" autocomplete="off" spellcheck="false" @change="saveUrl" />
          <button type="button" class="ink-round" :aria-label="showUrl ? 'Ocultar o endereço' : 'Mostrar o endereço'" :aria-pressed="showUrl" @click="showUrl = !showUrl"><Icon name="eye" size="sm" /></button>
        </div>
        <small>Trate como senha: quem tiver o endereço consegue disparar o fluxo.</small>
      </div>

      <div class="btn-row">
        <button type="button" class="btn btn--primary" :disabled="!url.trim() || flow.ping.busy" @click="test">
          <Icon name="refresh" size="sm" :class="{ spin: flow.ping.busy }" />{{ flow.ping.busy ? 'Testando…' : 'Testar conexão' }}
        </button>
        <span v-if="flow.ping.result" class="chip chip--ok"><Icon name="check" size="sm" />{{ pingChip }}</span>
        <span v-else-if="flow.ping.error" class="chip chip--bad"><Icon name="alert" size="sm" />{{ flow.ping.error }}</span>
      </div>

      <div class="grid-fields">
        <div class="field">
          <label for="set-timeout">Tempo-limite da conversão</label>
          <InkSelect id="set-timeout" v-model="settings.timeoutMin" :options="TIMEOUT_OPTIONS" />
        </div>
        <div class="field">
          <label for="set-pdf">Enviar também o PDF</label>
          <InkSelect id="set-pdf" v-model="settings.sendPdf" :options="PDF_OPTIONS" />
        </div>
      </div>

      <details class="howto">
        <summary><Icon name="info" size="sm" />Como conectar o agente (scope pronto para colar)</summary>
        <ol>
          <li>No Power Automate, crie um fluxo com o gatilho <b>Quando uma solicitação HTTP é recebida</b> — método POST, quem pode disparar: <b>Qualquer pessoa</b>.</li>
          <li>Abaixo do gatilho, <b>cole o scope</b> de <code>power-automate/</code> (Ctrl+V no designer). Nas ações do <b>OneDrive for Business</b>, escolha a sua conexão.</li>
          <li>Salve, copie a <b>URL HTTP</b> do gatilho e cole aqui. <b>Testar conexão</b> deve responder <code>mat-flow/3.0</code>, por tarefa.</li>
        </ol>
        <p class="muted">
          Contrato <code>{{ CONTRACT }}</code>: o fluxo responde na hora com o número da tarefa e o agente trabalha em segundo plano (pode levar vários minutos); o app consulta até o resultado ficar pronto — e retoma sozinho se você fechar a página no meio.
        </p>
      </details>
    </section>

    <section class="sheet-card">
      <header class="sheet-card-head">
        <span class="mark"><Icon name="doc" /></span>
        <div>
          <h3>Leitura do PDF</h3>
          <p>O texto sai do próprio PDF; páginas digitalizadas passam por OCR aqui no aparelho.</p>
        </div>
      </header>
      <div class="field">
        <label for="set-ocr">Leitura de páginas digitalizadas (OCR)</label>
        <InkSelect id="set-ocr" v-model="settings.ocrMode" :options="OCR_OPTIONS" />
      </div>
    </section>

    <section class="sheet-card">
      <header class="sheet-card-head">
        <span class="mark"><Icon :name="ui.dark ? 'moon' : 'sun'" /></span>
        <div>
          <h3>Aparência</h3>
          <p>O tema noite também começa a paisagem da Entrada à noite.</p>
        </div>
      </header>
      <ion-segment :value="settings.theme" aria-label="Tema" @ion-change="settings.theme = $event.detail.value as ThemeMode">
        <ion-segment-button value="auto">Automático</ion-segment-button>
        <ion-segment-button value="claro">Papel</ion-segment-button>
        <ion-segment-button value="escuro">Noite</ion-segment-button>
      </ion-segment>
      <label class="switch-row">
        <span class="grow"><b>Animações da interface</b><span>Desligue para uma tela totalmente estática (o pedido do sistema por menos movimento já é respeitado).</span></span>
        <ion-toggle :checked="settings.motion" aria-label="Animações" @ion-change="settings.motion = $event.detail.checked" />
      </label>
    </section>

    <section class="sheet-card">
      <header class="sheet-card-head">
        <span class="mark"><Icon name="archive" /></span>
        <div>
          <h3>Acervo</h3>
          <p>{{ lib.records.length }} matrícula(s){{ usage ? ` · ${fmtBytes(usage.usage)} usados neste aparelho` : '' }}.</p>
        </div>
      </header>
      <label class="switch-row">
        <span class="grow"><b>Salvar toda matrícula automaticamente</b><span>Grava 1,5 s depois de cada mudança, com selo de estado. O exemplo nunca é salvo.</span></span>
        <ion-toggle :checked="settings.autosave" aria-label="Salvamento automático" @ion-change="settings.autosave = $event.detail.checked" />
      </label>
      <div class="btn-row">
        <button type="button" class="btn btn--sm" @click="lib.exportBackup()"><Icon name="download" size="sm" />Baixar backup</button>
        <HoldButton label="Apagar o acervo" @confirm="wipe" />
      </div>
    </section>

    <section class="sheet-card">
      <header class="sheet-card-head">
        <span class="mark"><Icon name="offline" /></span>
        <div>
          <h3>Uso offline</h3>
          <p>O app já abre sem internet. Para fazer OCR e ler PDFs digitalizados offline, baixe uma vez os recursos (≈ 11 MB).</p>
        </div>
      </header>
      <div class="btn-row">
        <button type="button" class="btn btn--sm" :disabled="preparing || !ui.online" @click="prepare">
          <Icon name="download" size="sm" />{{ preparing ? 'Baixando…' : 'Preparar uso offline' }}
        </button>
        <span v-if="offline" class="chip" :class="offline.cached === offline.total ? 'chip--ok' : 'chip--mute'">{{ offline.cached }}/{{ offline.total }} recursos prontos</span>
      </div>
    </section>

    <p class="about">
      MatReader {{ APP_VERSION }} · núcleo geométrico em <b>{{ ui.kernel === 'wasm' ? 'WebAssembly' : 'TypeScript' }}</b> · OCR Tesseract (WebAssembly) · pdf.js com decodificadores WebAssembly
    </p>
  </InkSheet>
</template>

<style scoped>
.url-row {
  display: flex;
  align-items: center;
  gap: var(--s2);
}
.url-row .input {
  flex: 1;
}
.howto {
  border-radius: var(--r-md);
  border: 1px solid var(--line);
  background: var(--paper-2);
  font-size: 13px;
  line-height: 1.6;
  color: var(--ink-2);
}
.howto summary {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: var(--h-md);
  padding: 8px 16px;
  font-weight: 600;
  color: var(--ink);
  cursor: pointer;
  list-style: none;
}
.howto summary::-webkit-details-marker {
  display: none;
}
.howto summary .ink-icon {
  color: var(--slate-2);
}
.howto[open] summary {
  border-bottom: 1px dashed var(--line-2);
}
.howto ol {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 14px 18px 4px 36px;
}
.howto p {
  padding: 8px 18px 16px;
  font-size: 12.5px;
}
code {
  font-family: var(--f-mono);
  font-size: 0.92em;
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--paper-3);
}
.about {
  padding: 0 4px;
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--ink-3);
  text-align: center;
}
</style>
