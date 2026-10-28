/* Comandos do app num lugar só — os blocos, a barra, os atalhos e o
   arrastar-e-soltar chamam daqui, então cada ação tem um comportamento
   (e uma mensagem) único em qualquer layout. */
import { actionSheetController } from '@ionic/vue';
import { copyText, download, readClipboard } from '@/core/browser';
import { plural, safeFileName } from '@/core/text';
import { centroidLatLng } from '@/domain/geo/geometry';
import { parseAnchor } from '@/domain/geo/angles';
import { buildKml, buildKmz } from '@/domain/export/kml';
import { summaryText } from '@/domain/matricula/summary-text';
import { PROMPTS, type PromptKind } from '@/domain/prompts';
import { croquiDataUrl } from '@/features/terrain/paint';
import { FlowError } from '@/services/flow/flow-client';
import { getSavedDirectory, saveDirectory } from '@/services/library/library-db';
import { isJson } from '@/services/pdf/pdf-service';
import { pickFiles, ACCEPT_DOCS, ACCEPT_JSON } from '@/composables/useFilePicker';
import { toast } from '@/composables/useToast';
import { useFlowStore } from '@/stores/flow';
import { useLibraryStore } from '@/stores/library';
import { useMatriculaStore } from '@/stores/matricula';
import { useModalsStore } from '@/stores/modals';
import { useQueueStore } from '@/stores/queue';
import { useSettingsStore } from '@/stores/settings';
import { useUiStore, type PanelId } from '@/stores/ui';
import { goTo as navigate } from './navigation';
import { printDocument } from './print';

export function useAppActions() {
  const mat = useMatriculaStore();
  const flow = useFlowStore();
  const lib = useLibraryStore();
  const queue = useQueueStore();
  const settings = useSettingsStore();
  const ui = useUiStore();
  const modals = useModalsStore();

  const goTo = (id: PanelId) => navigate(id, ui.isDesktop);

  async function convert(files: File[]) {
    if (!files.length) return;
    void goTo('jornada');
    try {
      const ok = await flow.convert(files);
      if (ok) {
        await toast(`Pronto! ${mat.label} recebida e conferida.`, { type: 'ok' });
        void goTo('documento');
      }
    } catch (e) {
      const err = e instanceof FlowError ? e : new FlowError('fluxo', String(e));
      if (err.kind === 'cancelado') return void toast('Conversão cancelada.');
      const msg = [err.message, err.detail, err.hint].filter(Boolean).join(' — ');
      if (err.kind === 'config' && !settings.flowConfigured) {
        return void toast(msg, { type: 'erro', action: 'Configurar', onAction: () => void (modals.settings = true) });
      }
      if (flow.lastRaw) return void toast(msg, { type: 'erro', action: 'Ver resposta', onAction: showLastResponse });
      return void toast(msg, { type: 'erro' });
    }
  }

  async function pickAndConvert() {
    const files = await pickFiles({ accept: ACCEPT_DOCS, multiple: true });
    if (files.length) await convert(files);
  }

  async function photograph() {
    const files = await pickFiles({ accept: 'image/*', multiple: true, capture: true });
    if (files.length) await convert(files);
  }

  function loadDemo() {
    mat.loadDemo();
    void toast('Exemplo fictício carregado — ele nunca é salvo no acervo.');
    void goTo('documento');
  }

  function openText(text: string, source: 'arquivo' | 'colagem', name?: string) {
    const before = mat.editorText;
    const r = mat.loadText(text, { source });
    if (!r.ok) {
      void toast(`Não consegui ler: ${r.message}`, { type: 'erro' });
      return false;
    }
    void toast(name ? `${name} aberto.` : 'Conteúdo colado.', {
      type: 'ok',
      ms: 3000,
      action: 'Desfazer',
      onAction: () => (before ? void mat.loadText(before, { source: 'editor', reformat: false }) : void mat.clear()),
    });
    void goTo('documento');
    return true;
  }

  async function pasteJson() {
    const text = await readClipboard();
    if (text && text.trim()) return void openText(text, 'colagem');
    void goTo('json');
    setTimeout(() => document.getElementById('json-editor')?.focus(), 450);
    void toast('O navegador não deixou ler a área de transferência: cole com Ctrl+V no Editor JSON.', { ms: 6000 });
  }

  async function openJsonFile() {
    const [f] = await pickFiles({ accept: ACCEPT_JSON });
    if (f) openText(await f.text(), 'arquivo', f.name);
  }

  async function copyPrompt(kind: PromptKind) {
    const ok = await copyText(PROMPTS[kind].text);
    void toast(ok ? 'Prompt copiado — cole numa IA junto com o PDF ou as fotos.' : 'Não consegui copiar. Abra o prompt e copie manualmente.', {
      type: ok ? 'ok' : 'erro',
    });
  }

  async function copySummary() {
    if (!mat.data) return;
    const ok = await copyText(summaryText(mat.data, mat.summary, mat.checks));
    void toast(ok ? 'Resumo copiado — pronto para colar no Teams ou no e-mail.' : 'Não consegui copiar o resumo.', { type: ok ? 'ok' : 'erro' });
  }

  async function saveNow() {
    const st = await lib.saveCurrent(true);
    if (st.kind === 'ok') void toast('Matrícula salva no acervo.', { type: 'ok', ms: 2600 });
    else if (st.kind === 'warn' && mat.isDemo) void toast('O exemplo nunca é salvo — carregue uma matrícula de verdade.');
    else if (st.kind === 'warn') void toast('Esta matrícula não tem número: preencha matricula.numero no Editor JSON para salvar.', { type: 'erro' });
    else if (st.kind === 'bad') void toast('Não consegui salvar neste aparelho.', { type: 'erro' });
  }

  function newMatricula() {
    if (!mat.data) return;
    const undo = mat.clear();
    void toast('Matrícula fechada. A anterior continua no acervo.', { action: 'Desfazer', onAction: undo, ms: 9000 });
    void goTo('entrada');
  }

  function print() {
    if (!printDocument()) void toast('Carregue uma matrícula antes de imprimir.', { type: 'erro' });
  }

  function downloadJson() {
    if (!mat.data) return void toast('Carregue uma matrícula primeiro.', { type: 'erro' });
    download(JSON.stringify(mat.data, null, 2), `Matricula_${safeFileName(mat.data.matricula.numero ?? 'dados')}.json`, 'application/json');
    void toast('JSON baixado.', { type: 'ok', ms: 2200 });
  }

  function showLastResponse() {
    modals.openText({ title: 'Resposta do fluxo', subtitle: 'o que o agente devolveu, sem tratamento', text: flow.lastRaw, filename: 'resposta_fluxo.txt' });
  }

  function showLastText() {
    if (!flow.lastText) return void toast('Ainda não houve envio nesta sessão.');
    modals.openText({ title: 'Texto enviado ao agente', subtitle: 'extraído do PDF e/ou por OCR, já limpo', text: flow.lastText, filename: 'texto_enviado.txt' });
  }

  /* ---------- terreno: exportações ---------- */
  async function exportGeo(kind: 'kml' | 'kmz' | 'gmaps' | 'croqui') {
    const d = mat.data;
    if (!d) return;
    if (kind === 'gmaps') {
      const c = mat.latLngs ? centroidLatLng(mat.latLngs) : parseAnchor(mat.fit.anchor);
      if (!c) return void toast('Posicione o polígono no mapa primeiro.', { type: 'erro' });
      window.open(`https://www.google.com/maps/@${c.lat.toFixed(7)},${c.lon.toFixed(7)},350m/data=!3m1!1e3`, '_blank', 'noopener,noreferrer');
      return;
    }
    if (kind === 'croqui') {
      const url = croquiDataUrl(mat.points, mat.geo.kind, mat.geo.labels, d.dados_geoespaciais);
      if (!url) return void toast('Sem polígono para desenhar.', { type: 'erro' });
      const a = document.createElement('a');
      a.href = url;
      a.download = `Croqui_${safeFileName(d.matricula.numero ?? 'matricula')}.png`;
      a.click();
      return;
    }
    const r = buildKml(d, mat.geo, mat.fit, mat.latLngs, mat.summary);
    if (!r.ok) return void toast(r.reason, { type: 'erro' });
    if (kind === 'kml') {
      download(r.kml, `${r.name}.kml`, 'application/vnd.google-earth.kml+xml');
      return void toast('KML baixado — abra no Google Earth.', { type: 'ok' });
    }
    const bytes = buildKmz(r.kml);
    const file = `${r.name}.kmz`;
    if (window.showDirectoryPicker) {
      try {
        let dir = await getSavedDirectory();
        if (!dir) {
          void toast('Escolha a pasta onde os KMZ serão gravados (só desta vez).', { ms: 5000 });
          dir = await window.showDirectoryPicker({ id: 'matriculasDir', mode: 'readwrite' });
          await saveDirectory(dir);
        }
        const fh = await dir.getFileHandle(file, { create: true });
        const w = await fh.createWritable();
        await w.write(bytes as BlobPart);
        await w.close();
        return void toast(`KMZ gravado na pasta escolhida: ${file}`, { type: 'ok' });
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return void toast('Escolha de pasta cancelada — o KMZ não foi salvo.');
      }
    }
    download(bytes as BlobPart, file, 'application/vnd.google-earth.kmz');
    void toast('KMZ baixado.', { type: 'ok' });
  }

  async function openExportSheet() {
    const sheet = await actionSheetController.create({
      header: 'Exportar o terreno',
      cssClass: 'ink-sheet',
      buttons: [
        { text: 'Baixar KML (Google Earth)', handler: () => void exportGeo('kml') },
        { text: 'Gravar KMZ numa pasta', handler: () => void exportGeo('kmz') },
        { text: 'Abrir no Google Maps', handler: () => void exportGeo('gmaps') },
        { text: 'Baixar croqui (PNG)', handler: () => void exportGeo('croqui') },
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  /* ---------- fila de PDF ---------- */
  function addToQueue(files: File[], quiet = false) {
    const r = queue.add(files);
    if (r.rejected.length) {
      void toast(`${plural(r.rejected.length, 'arquivo', 'arquivos')} fora do formato (PDF ou imagem): ${r.rejected.slice(0, 3).map((f) => f.name).join(', ')}`, { type: 'erro' });
    }
    if (r.added.length && !quiet) void toast(`${plural(r.added.length, 'arquivo entrou', 'arquivos entraram')} na fila.`, { type: 'ok', ms: 2400 });
    return r.added.length;
  }

  async function addToQueuePicker() {
    const files = await pickFiles({ accept: ACCEPT_DOCS, multiple: true });
    if (files.length) addToQueue(files);
  }

  async function generatePdf() {
    try {
      const name = await queue.generate(settings.removeLinks);
      if (name) void toast(settings.removeLinks ? `PDF limpo gerado: ${name}` : `PDF consolidado gerado: ${name}`, { type: 'ok' });
    } catch (e) {
      void toast(`Não consegui gerar o PDF: ${(e as Error)?.message ?? e}`, { type: 'erro' });
    }
  }

  /** Arquivos soltos fora de um destino: pergunta em vez de decidir. */
  async function handleDrop(files: File[], target?: 'ia' | 'pdf') {
    if (!files.length) return;
    const jsons = files.filter(isJson);
    if (jsons.length === files.length) {
      openText(await jsons[0]!.text(), 'arquivo', jsons[0]!.name);
      return;
    }
    if (target === 'ia') return void convert(files);
    if (target === 'pdf') {
      addToQueue(files);
      return void goTo('pdfs');
    }
    const sheet = await actionSheetController.create({
      header: `${plural(files.length, 'arquivo', 'arquivos')} — o que faço?`,
      buttons: [
        { text: 'Converter com IA (envia ao seu fluxo)', handler: () => void convert(files) },
        { text: 'Juntar na fila de PDF (fica no aparelho)', handler: () => { addToQueue(files); void goTo('pdfs'); } },
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  async function testConnection() {
    try {
      const r = await flow.testConnection();
      void toast(
        r.envelope
          ? `Fluxo do MatReader respondeu em ${r.ms} ms${r.versao ? ` (${r.versao})` : ''}${r.agente ? ` · agente ${r.agente}` : ''}.`
          : `O fluxo respondeu em ${r.ms} ms, mas é o fluxo antigo (sem teste de conexão). O PDF continuará indo junto.`,
        { type: 'ok', ms: 6000 },
      );
    } catch (e) {
      const err = e as FlowError;
      void toast([err.message, err.detail, err.hint].filter(Boolean).join(' — '), { type: 'erro' });
    }
  }

  return {
    goTo, convert, pickAndConvert, photograph, loadDemo, pasteJson, openJsonFile, openText, copyPrompt, copySummary,
    saveNow, newMatricula, print, downloadJson, showLastResponse, showLastText, exportGeo, openExportSheet,
    addToQueue, addToQueuePicker, generatePdf, handleDrop, testConnection,
  };
}
