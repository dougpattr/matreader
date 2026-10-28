/* A jornada da matrícula: arquivo → texto (PDF/OCR) → envio ao fluxo →
   agente do Copilot Studio → conferência → documento. Com cancelar,
   tempo-limite, progresso real e histórico das últimas execuções. */
import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import { local, sha256Hex } from '@/core/browser';
import { extractText, type ExtractedText } from '@/services/extract/text-extraction';
import { convertWithFlow, FlowError, pingFlow, type PingResponse } from '@/services/flow/flow-client';
import { isSupported, mergeFiles, rasterize, stripAnnotations, toBase64 } from '@/services/pdf/pdf-service';
import { useMatriculaStore } from './matricula';
import { useSettingsStore } from './settings';

export type StageId = 'arquivo' | 'texto' | 'envio' | 'agente' | 'conferencia';

export const STAGES: { id: StageId; label: string; short: string; hint: string }[] = [
  { id: 'arquivo', label: 'Arquivo', short: 'Arquivo', hint: 'junta e prepara' },
  { id: 'texto', label: 'Texto', short: 'Texto', hint: 'PDF ou OCR' },
  { id: 'envio', label: 'Envio', short: 'Envio', hint: 'ao seu fluxo' },
  { id: 'agente', label: 'Agente', short: 'Agente', hint: 'extrai e confere' },
  { id: 'conferencia', label: 'Conferência', short: 'Conferir', hint: 'o app refaz as contas' },
];

export const PHRASES = [
  'Acordando o robô do cartório…',
  'Decifrando letra de escrivão. Isso aqui é esporte.',
  'Contando os vértices nos dedos.',
  'Traduzindo juridiquês para JSON.',
  'Procurando o azimute que fugiu do memorial.',
  'Separando os R.1 dos AV.2.',
  'Convertendo graus, minutos e segundos.',
  'Caçando CPFs escondidos no meio do parágrafo.',
  'Desenrolando o memorial descritivo. Ele é comprido.',
  'Verificando se alguém lembrou de cancelar a hipoteca.',
  'Alinhando o norte. O norte resiste.',
  'Lendo a averbação que ninguém nunca leu.',
  'Somando a área. Depois somando de novo, por garantia.',
  'Conferindo o que a IA respondeu — duas vezes.',
  'Isso costuma levar de 30 segundos a 2 minutos.',
  'Quase lá. A tribo segue viagem.',
];

export interface RunRecord {
  id: string;
  at: number;
  file: string;
  pages: number;
  method: string;
  chars: number;
  ms: number;
  ok: boolean;
  numero: string | null;
  message: string;
}

export interface PingState {
  busy: boolean;
  at: number;
  result: PingResponse | null;
  error: string | null;
}

const HISTORY_KEY = 'matreader:execucoes:v1';

export const useFlowStore = defineStore('flow', () => {
  const settings = useSettingsStore();
  const mat = useMatriculaStore();

  const busy = ref(false);
  const stage = ref<StageId | null>(null);
  const progress = ref(0);
  const label = ref('');
  const phrase = ref('');
  const t0 = ref(0);
  const now = ref(Date.now());
  const outcome = ref<'ok' | 'erro' | null>(null);
  const error = shallowRef<FlowError | null>(null);
  const extracted = shallowRef<Omit<ExtractedText, 'text'> | null>(null);
  const lastText = ref('');
  const lastRaw = ref('');
  const history = ref<RunRecord[]>(local.json<RunRecord[]>(HISTORY_KEY, []));
  const ping = ref<PingState>({ busy: false, at: 0, result: null, error: null });

  let controller: AbortController | null = null;
  let tick: ReturnType<typeof setInterval> | undefined;
  let phraseTimer: ReturnType<typeof setInterval> | undefined;
  let runId = 0;
  let waitStart = 0;

  const elapsed = computed(() => (busy.value || outcome.value ? now.value - t0.value : 0));
  const stageIndex = computed(() => (stage.value ? STAGES.findIndex((s) => s.id === stage.value) : -1));

  function nextPhrase() {
    let p = phrase.value;
    while (p === phrase.value) p = PHRASES[Math.floor(Math.random() * PHRASES.length)]!;
    phrase.value = p;
  }

  function set(st: StageId, p: number, l: string) {
    stage.value = st;
    progress.value = Math.max(progress.value, Math.min(1, p));
    label.value = l;
  }

  function begin(): number {
    runId++;
    busy.value = true;
    outcome.value = null;
    error.value = null;
    progress.value = 0;
    t0.value = Date.now();
    now.value = t0.value;
    controller = new AbortController();
    nextPhrase();
    clearInterval(tick);
    clearInterval(phraseTimer);
    tick = setInterval(() => {
      now.value = Date.now();
      // enquanto o agente pensa, a barra avança devagar rumo a 92%
      if (stage.value === 'agente') {
        const s = (now.value - waitStart) / 1000;
        progress.value = Math.max(progress.value, 0.62 + 0.3 * (1 - Math.exp(-s / 45)));
      }
    }, 500);
    phraseTimer = setInterval(nextPhrase, 4800);
    return runId;
  }

  function end(id: number, ok: boolean) {
    if (id !== runId) return;
    busy.value = false;
    outcome.value = ok ? 'ok' : 'erro';
    now.value = Date.now();
    clearInterval(tick);
    clearInterval(phraseTimer);
    controller = null;
  }

  function record(r: Omit<RunRecord, 'id' | 'at'>) {
    history.value = [{ id: `${Date.now().toString(36)}`, at: Date.now(), ...r }, ...history.value].slice(0, 15);
    local.setJson(HISTORY_KEY, history.value);
  }

  function cancel() {
    if (!busy.value) return;
    controller?.abort();
  }

  function dismiss() {
    if (busy.value) return;
    outcome.value = null;
    stage.value = null;
    error.value = null;
  }

  /** Converte os arquivos com o agente. Devolve true se a matrícula abriu. */
  async function convert(list: File[]): Promise<boolean> {
    if (busy.value) throw new FlowError('config', 'Já existe uma conversão em andamento.');
    const files = list.filter(isSupported);
    if (!files.length) throw new FlowError('config', 'Escolha o PDF ou as fotos da matrícula.');
    if (!settings.flowConfigured) throw new FlowError('config', 'Configure a URL do fluxo em Configurações.', '', 0, 'Toque em Configurações → Fluxo do Power Automate.');
    const id = begin();
    const signal = controller!.signal;
    const fileName = files.length > 1 ? `${files.length} arquivos unificados` : files[0]!.name;
    let stats: Omit<ExtractedText, 'text'> | null = null;
    try {
      set('arquivo', 0.03, files.length > 1 ? `Preparando ${files.length} arquivos` : 'Preparando o arquivo');
      set('texto', 0.06, 'Lendo o texto');
      const ex = await extractText(files, settings.ocrMode, (p, l) => set('texto', 0.06 + p * 0.44, l), signal);
      const { text, ...rest } = ex;
      stats = rest;
      extracted.value = rest;
      lastText.value = text;
      if (!text.trim()) {
        throw new FlowError('config', 'Não encontrei texto neste arquivo.', '', 0,
          settings.ocrMode === 'nunca' ? 'Ative o OCR em Configurações para ler páginas digitalizadas.' : 'A imagem pode estar ilegível: tente uma digitalização melhor.');
      }

      let base64: string | undefined;
      if (settings.shouldSendPdf) {
        set('envio', 0.52, 'Preparando o PDF para o fluxo antigo');
        let bytes = await mergeFiles(files);
        bytes = (await stripAnnotations(bytes)).bytes;
        if (bytes.byteLength > 20 * 1024 * 1024) bytes = await rasterize(bytes, { targetWidth: 1000, jpegQuality: 0.45 });
        base64 = await toBase64(bytes);
      }
      signal.throwIfAborted();

      set('envio', 0.58, 'Enviando ao fluxo');
      const hash = await sha256Hex(new TextEncoder().encode(text));
      set('agente', 0.62, 'O agente está lendo a matrícula');
      waitStart = Date.now();
      const resp = await convertWithFlow(
        settings.flowUrl.trim(),
        {
          filename: files.length > 1 ? 'documentos_unificados.pdf' : files[0]!.name,
          texto: text,
          paginas: ex.pages,
          metodo_texto: ex.method,
          ocr_confianca: ex.ocrConfidence,
          sha256: hash,
          base64Encoded: base64,
        },
        signal,
        Math.max(1, settings.timeoutMin) * 60_000,
      );
      settings.flowContract = resp.envelope ? 'v2' : 'v1';
      lastRaw.value = resp.raw;

      set('conferencia', 0.95, 'Conferindo e montando o documento');
      const loaded = mat.loadText(resp.raw, { source: 'ia', meta: resp.meta ?? { metodo_texto: ex.method, ocr_confianca: ex.ocrConfidence, paginas: ex.pages } });
      if (!loaded.ok) {
        throw new FlowError('fluxo', 'A resposta não trouxe um JSON de matrícula que eu conseguisse ler.', loaded.message, resp.status,
          'Abra "Ver resposta" para conferir o que o agente devolveu.');
      }
      progress.value = 1;
      label.value = mat.data?.matricula.numero ? `Matrícula ${mat.data.matricula.numero} carregada` : 'Matrícula carregada';
      end(id, true);
      record({ file: fileName, pages: ex.pages, method: ex.method, chars: ex.chars, ms: Date.now() - t0.value, ok: true, numero: mat.data?.matricula.numero ?? null, message: 'ok' });
      return true;
    } catch (e) {
      const err = e instanceof FlowError ? e : (e as Error)?.name === 'AbortError' ? new FlowError('cancelado', 'Conversão cancelada.') : new FlowError('fluxo', String((e as Error)?.message ?? e));
      error.value = err;
      label.value = err.message;
      end(id, false);
      if (err.kind !== 'cancelado') {
        record({ file: fileName, pages: stats?.pages ?? 0, method: stats?.method ?? '—', chars: stats?.chars ?? 0, ms: Date.now() - t0.value, ok: false, numero: null, message: err.message });
      }
      throw err;
    }
  }

  async function testConnection(): Promise<PingResponse> {
    ping.value = { ...ping.value, busy: true, error: null };
    try {
      const r = await pingFlow(settings.flowUrl.trim());
      settings.flowContract = r.envelope ? 'v2' : 'v1';
      ping.value = { busy: false, at: Date.now(), result: r, error: null };
      return r;
    } catch (e) {
      const msg = e instanceof FlowError ? `${e.message}${e.detail ? ` — ${e.detail}` : ''}` : String(e);
      ping.value = { busy: false, at: Date.now(), result: null, error: msg };
      throw e;
    }
  }

  function clearHistory() {
    history.value = [];
    local.del(HISTORY_KEY);
  }

  return {
    busy, stage, stageIndex, progress, label, phrase, elapsed, outcome, error, extracted, lastText, lastRaw, history, ping,
    convert, cancel, dismiss, testConnection, clearHistory,
  };
});
