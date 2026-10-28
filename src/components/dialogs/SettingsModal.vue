<script setup lang="ts">
/* Configurações: fluxo do Power Automate (com teste), OCR, aparência,
   acervo e uso offline. */
import { IonButton, IonButtons, IonContent, IonHeader, IonModal, IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonTitle, IonToggle, IonToolbar } from '@ionic/vue';
import { onMounted, ref, watch } from 'vue';
import { useAppActions } from '@/app/actions';
import HoldButton from '@/components/ink/HoldButton.vue';
import Icon from '@/components/ink/Icon.vue';
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

const showUrl = ref(false);
const url = ref(settings.flowUrl);
const offline = ref<{ cached: number; total: number } | null>(null);
const usage = ref<{ usage: number; quota: number } | null>(null);
const preparing = ref(false);

watch(() => modals.settings, async (open) => {
  if (!open) return;
  url.value = settings.flowUrl;
  offline.value = await offlineCacheStatus();
  usage.value = await storageEstimate();
});
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
  <ion-modal class="ink-modal" :is-open="modals.settings" @did-dismiss="modals.settings = false">
    <ion-header>
      <ion-toolbar>
        <ion-title>Configurações</ion-title>
        <ion-buttons slot="end">
          <ion-button aria-label="Fechar" @click="modals.settings = false"><Icon name="x" /></ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div class="sheet">
        <section>
          <h3><Icon name="plug" size="sm" />Fluxo do Power Automate</h3>
          <div class="field">
            <label for="flow-url">Endereço do gatilho HTTP</label>
            <div class="row nowrap">
              <input id="flow-url" v-model="url" class="input mono" :type="showUrl ? 'text' : 'password'" placeholder="https://…/workflows/…/triggers/manual/paths/invoke?…" autocomplete="off" @change="saveUrl" />
              <button type="button" class="ink-round sm" :aria-label="showUrl ? 'Ocultar o endereço' : 'Mostrar o endereço'" @click="showUrl = !showUrl"><Icon name="eye" size="sm" /></button>
            </div>
            <small>Fica só neste aparelho. Trate como senha: quem tiver o endereço consegue disparar o fluxo.</small>
          </div>
          <div class="row">
            <button type="button" class="plaque plaque--sm plaque--primary" :disabled="!url.trim() || flow.ping.busy" @click="test">
              <Icon name="refresh" size="sm" />{{ flow.ping.busy ? 'Testando…' : 'Testar conexão' }}
            </button>
            <span v-if="flow.ping.result" class="chip chip--ok">{{ flow.ping.result.envelope ? `scope ${flow.ping.result.versao ?? 'MatReader'}` : 'fluxo antigo' }} · {{ flow.ping.result.ms }} ms</span>
            <span v-else-if="flow.ping.error" class="chip chip--bad">{{ flow.ping.error }}</span>
          </div>
          <div class="grid2">
            <div class="field">
              <label>Leitura de páginas digitalizadas (OCR)</label>
              <ion-select :value="settings.ocrMode" interface="popover" aria-label="Modo do OCR" @ion-change="settings.ocrMode = $event.detail.value as OcrMode">
                <ion-select-option value="auto">Automático (só onde não há texto)</ion-select-option>
                <ion-select-option value="sempre">Sempre (ignora o texto do PDF)</ion-select-option>
                <ion-select-option value="nunca">Nunca</ion-select-option>
              </ion-select>
            </div>
            <div class="field">
              <label>Enviar também o PDF</label>
              <ion-select :value="settings.sendPdf" interface="popover" aria-label="Enviar o PDF" @ion-change="settings.sendPdf = $event.detail.value as SendPdfMode">
                <ion-select-option value="auto">Automático (só para o fluxo antigo)</ion-select-option>
                <ion-select-option value="sempre">Sempre</ion-select-option>
                <ion-select-option value="nunca">Nunca</ion-select-option>
              </ion-select>
            </div>
            <div class="field">
              <label>Tempo-limite da conversão</label>
              <ion-select :value="settings.timeoutMin" interface="popover" aria-label="Tempo-limite" @ion-change="settings.timeoutMin = Number($event.detail.value)">
                <ion-select-option :value="3">3 minutos</ion-select-option>
                <ion-select-option :value="5">5 minutos</ion-select-option>
                <ion-select-option :value="10">10 minutos</ion-select-option>
              </ion-select>
            </div>
          </div>
          <details class="howto">
            <summary>Como conectar o agente (scope pronto para colar)</summary>
            <ol>
              <li>No Power Automate, crie um fluxo com o gatilho <b>Quando uma solicitação HTTP é recebida</b> (método POST, <b>Qualquer pessoa</b>).</li>
              <li>Abaixo do gatilho, <b>cole o scope</b> de <code>power-automate/</code> (Ctrl+V no designer). Ele valida o texto, chama o agente do Copilot Studio e devolve o resultado.</li>
              <li>Salve, copie a <b>URL HTTP</b> do gatilho e cole aqui. Clique em <b>Testar conexão</b>.</li>
            </ol>
            <p class="muted">Contrato <code>{{ CONTRACT }}</code>. O app extrai o texto do PDF (ou faz OCR no aparelho) e o agente devolve o JSON da matrícula.</p>
          </details>
        </section>

        <section>
          <h3><Icon name="sun" size="sm" />Aparência</h3>
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

        <section>
          <h3><Icon name="archive" size="sm" />Acervo</h3>
          <label class="switch-row">
            <span class="grow"><b>Salvar toda matrícula automaticamente</b><span>Grava 1,5 s depois de cada mudança, com selo de estado. O exemplo nunca é salvo.</span></span>
            <ion-toggle :checked="settings.autosave" aria-label="Salvamento automático" @ion-change="settings.autosave = $event.detail.checked" />
          </label>
          <div class="row">
            <button type="button" class="plaque plaque--sm" @click="lib.exportBackup()"><Icon name="download" size="sm" />Baixar backup</button>
            <HoldButton label="Apagar o acervo" @confirm="wipe" />
          </div>
          <small class="muted">{{ lib.records.length }} matrícula(s){{ usage ? ` · ${fmtBytes(usage.usage)} usados neste aparelho` : '' }}</small>
        </section>

        <section>
          <h3><Icon name="offline" size="sm" />Uso offline</h3>
          <p class="muted">O app já abre sem internet. Para fazer OCR e ler PDFs digitalizados offline, baixe uma vez os recursos (≈ 11 MB).</p>
          <div class="row">
            <button type="button" class="plaque plaque--sm" :disabled="preparing || !ui.online" @click="prepare">
              <Icon name="download" size="sm" />{{ preparing ? 'Baixando…' : 'Preparar uso offline' }}
            </button>
            <span v-if="offline" class="chip" :class="offline.cached === offline.total ? 'chip--ok' : 'chip--mute'">{{ offline.cached }}/{{ offline.total }} recursos prontos</span>
          </div>
          <p class="muted small">
            MatReader {{ APP_VERSION }} · núcleo geométrico em <b>{{ ui.kernel === 'wasm' ? 'WebAssembly' : 'TypeScript' }}</b> · OCR Tesseract (WebAssembly) · pdf.js com decodificadores WebAssembly
          </p>
        </section>
      </div>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
.sheet {
  display: grid;
  gap: var(--s6);
  padding-bottom: var(--s6);
}
section {
  display: grid;
  gap: var(--s3);
}
h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 6px;
  border-bottom: 1px dashed var(--line-2);
  font: 700 12px/1.3 var(--f-ui);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--slate-2);
}
.grid2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--s3);
}
ion-select {
  min-height: 40px;
  padding: 0 12px;
  border-radius: var(--r-sm);
  border: 1px solid var(--line-2);
  background: var(--paper-3);
}
.nowrap {
  flex-wrap: nowrap;
}
.howto {
  padding: var(--s3);
  border-radius: var(--r-sm);
  background: var(--paper-3);
  font-size: 13px;
}
.howto summary {
  cursor: pointer;
  font-weight: 600;
}
.howto ol {
  margin: var(--s2) 0;
  padding-left: 20px;
  display: grid;
  gap: 6px;
}
.small {
  font-size: 12px;
}
</style>
