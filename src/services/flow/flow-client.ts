/* Cliente do fluxo do Power Automate (gatilho HTTP → agente do Copilot
   Studio). Contrato "matreader/fluxo@3" — assíncrono por tarefa, porque o
   Power Automate encerra a resposta HTTP síncrona em ~2 minutos e o agente
   costuma levar mais que isso:

     converter  { acao:"converter", texto, filename, … }
                → { ok:true, status:"processando", tarefa:"<id>" }   (em ~2 s)
     consultar  { acao:"consultar", tarefa }
                → { ok:true, status:"processando" }                  (ainda não)
                → { ok:true, status:"concluido", resposta, meta }    (pronto)
                → { ok:false, status:"erro", mensagem, detalhe }
     concluir   { acao:"concluir", tarefa }  → o fluxo apaga a tarefa
     ping       { ping:true } → { ok:true, pong:true, versao, modo }

   Também aceita o scope síncrono (fluxo@2), o fluxo antigo (resposta = o
   JSON da matrícula) e o 202 + Location do Power Automate. */
import type { FlowMeta } from '@/domain/matricula/types';

export const CONTRACT = 'matreader/fluxo@3';
export const APP_VERSION = '4.1.0';

export type FlowErrorKind = 'config' | 'rede' | 'http' | 'tempo' | 'cancelado' | 'vazio' | 'fluxo';

export class FlowError extends Error {
  constructor(
    readonly kind: FlowErrorKind,
    message: string,
    readonly detail = '',
    readonly status = 0,
    readonly hint = '',
  ) {
    super(message);
    this.name = 'FlowError';
  }
}

export interface ConvertRequest {
  filename: string;
  texto: string;
  paginas: number;
  metodo_texto: string;
  ocr_confianca: number | null;
  sha256: string | null;
  base64Encoded?: string;
}

export interface ConvertResponse {
  /** texto do agente (ou do fluxo antigo) que contém o JSON da matrícula */
  raw: string;
  meta: FlowMeta | null;
  envelope: boolean;
  status: number;
}

export interface PingResponse {
  ok: boolean;
  versao: string | null;
  agente: string | null;
  limite: number | null;
  modo: 'tarefa' | 'sincrono' | null;
  ms: number;
  envelope: boolean;
}

/** Acompanhamento de uma tarefa em andamento no fluxo. */
export interface TaskProgress {
  tarefa: string;
  consultas: number;
  desde: number;
}

type Envelope = Record<string, unknown>;
type Read = { kind: 'final'; result: ConvertResponse } | { kind: 'tarefa'; tarefa: string };

const SYNC_LIMIT_MS = 115_000;
const app = { nome: 'MatReader', versao: APP_VERSION };

function cleanMsg(s: string, max = 220): string {
  return String(s)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function parseObj(text: string): Envelope | null {
  try {
    const v = JSON.parse(text);
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Envelope) : null;
  } catch {
    return null;
  }
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('cancelado', 'AbortError'));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        reject(new DOMException('cancelado', 'AbortError'));
      },
      { once: true },
    );
  });
}

async function post(url: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
}

/** Resposta assíncrona nativa do Power Automate: 202 + Location. Só funciona
 *  se o navegador puder ler o cabeçalho (o protocolo por tarefa não precisa). */
async function follow(resp: Response, signal: AbortSignal, deadline: number): Promise<Response> {
  let r = resp;
  while (r.status === 202) {
    const loc = r.headers.get('Location');
    if (!loc) {
      throw new FlowError('fluxo', 'O fluxo respondeu 202 (resposta assíncrona nativa), mas o navegador não recebe o endereço de acompanhamento.', '',
        202, 'Use o scope do MatReader (protocolo por tarefa) e desligue "Resposta assíncrona" na ação Responder.');
    }
    if (Date.now() > deadline) throw new FlowError('tempo', 'O fluxo passou do tempo-limite configurado.');
    await wait(4000, signal);
    r = await fetch(loc, { signal });
  }
  return r;
}

function networkError(e: unknown, elapsed: number): FlowError {
  if ((e as Error)?.name === 'AbortError') return new FlowError('cancelado', 'Envio cancelado.');
  if (e instanceof FlowError) return e;
  if (elapsed >= SYNC_LIMIT_MS - 10_000) {
    return new FlowError('tempo', 'O Power Automate encerrou a conexão (limite de ~2 minutos da resposta síncrona).',
      String((e as Error)?.message ?? e), 0,
      'Atualize o scope do fluxo para a versão com tarefas (fluxo@3) — ela responde na hora e o app acompanha o agente.');
  }
  return new FlowError('rede', 'Não consegui falar com o fluxo.', String((e as Error)?.message ?? e), 0,
    'Confira a internet, a URL em Configurações e se o gatilho HTTP aceita "Qualquer pessoa".');
}

/** O conector do OneDrive às vezes devolve o arquivo embrulhado em base64:
 *  { "$content-type": "...", "$content": "eyJvayI6..." }. */
function unwrapContent(text: string): string {
  const obj = parseObj(text);
  const b64 = obj?.['$content'];
  if (typeof b64 !== 'string') return text;
  try {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes).trim();
  } catch {
    return text;
  }
}

/** Lê qualquer resposta do fluxo e diz se é resultado final ou tarefa. */
async function read(resp: Response): Promise<Read> {
  const text = unwrapContent(((await resp.text()) || '').trim());
  const obj = parseObj(text);
  const isEnvelope = !!obj && typeof obj.ok === 'boolean';

  if (isEnvelope && obj!.ok === false) {
    throw new FlowError('fluxo', cleanMsg(String(obj!.mensagem ?? 'O fluxo informou uma falha.')), cleanMsg(String(obj!.detalhe ?? ''), 400),
      resp.status, obj!.etapa ? `Etapa: ${String(obj!.etapa)}` : '');
  }
  if (!resp.ok) {
    const msg = obj?.mensagem ? `${obj.mensagem}${obj.detalhe ? ` (${obj.detalhe})` : ''}` : text;
    const timeout = resp.status === 504 || /timed out|tempo/i.test(String(msg));
    throw new FlowError(timeout ? 'tempo' : 'http', `O fluxo respondeu ${resp.status}.`, cleanMsg(String(msg)), resp.status,
      timeout ? 'O agente passou de ~2 minutos: atualize o scope para a versão com tarefas (fluxo@3).' : '');
  }
  if (!text) throw new FlowError('vazio', 'O fluxo respondeu vazio.', '', resp.status, 'Confira se o fluxo termina com a ação Responder.');

  if (isEnvelope && obj!.status === 'processando') {
    const tarefa = String(obj!.tarefa ?? '').trim();
    return { kind: 'tarefa', tarefa };
  }
  if (isEnvelope) {
    const r = obj!.resposta;
    const raw = typeof r === 'string' ? r : r ? JSON.stringify(r) : '';
    if (!raw.trim()) throw new FlowError('vazio', 'O agente concluiu sem conteúdo.', '', resp.status, 'Veja o histórico de execuções do fluxo, ação Execute Agent and wait.');
    const meta = (obj!.meta && typeof obj!.meta === 'object' ? obj!.meta : null) as FlowMeta | null;
    if (meta && typeof obj!.versao === 'string') meta.versao = obj!.versao;
    return { kind: 'final', result: { raw, meta, envelope: true, status: resp.status } };
  }
  return { kind: 'final', result: { raw: text, meta: null, envelope: false, status: resp.status } };
}

/** Acompanha uma tarefa até ela terminar (ou até o prazo). Tolera algumas
 *  falhas de rede seguidas — o resultado continua guardado no fluxo. */
export async function awaitTask(
  url: string,
  tarefa: string,
  signal: AbortSignal,
  deadline: number,
  onProgress?: (p: TaskProgress) => void,
  desde = Date.now(),
): Promise<ConvertResponse> {
  let consultas = 0;
  let falhas = 0;
  await wait(5000, signal);
  for (;;) {
    if (Date.now() > deadline) {
      throw new FlowError('tempo', 'O agente passou do tempo-limite configurado.', `tarefa ${tarefa}`, 0,
        'A tarefa continua no fluxo: o app retoma sozinho quando você abrir de novo, ou aumente o tempo-limite em Configurações.');
    }
    consultas++;
    try {
      const r = await read(await post(url, { contrato: CONTRACT, app, acao: 'consultar', tarefa }, signal));
      falhas = 0;
      if (r.kind === 'final') {
        void post(url, { contrato: CONTRACT, app, acao: 'concluir', tarefa }).catch(() => {});
        return r.result;
      }
      onProgress?.({ tarefa, consultas, desde });
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') throw new FlowError('cancelado', 'Conversão cancelada.');
      if (e instanceof FlowError && e.kind !== 'rede') throw e;
      if (++falhas >= 5) throw e instanceof FlowError ? e : networkError(e, 0);
    }
    // 5 s no primeiro meio minuto, depois 10 s: cada consulta é uma execução do fluxo
    await wait(consultas < 6 ? 5000 : 10_000, signal);
  }
}

export async function convertWithFlow(
  url: string,
  req: ConvertRequest,
  signal: AbortSignal,
  timeoutMs = 600_000,
  onTask?: (tarefa: string) => void,
  onProgress?: (p: TaskProgress) => void,
): Promise<ConvertResponse> {
  if (!url) throw new FlowError('config', 'Configure a URL do fluxo em Configurações.');
  const t0 = Date.now();
  const deadline = t0 + timeoutMs;
  let resp: Response;
  try {
    resp = await post(url, { contrato: CONTRACT, app, acao: 'converter', caracteres: req.texto.length, ...req }, signal);
    resp = await follow(resp, signal, deadline);
  } catch (e) {
    throw networkError(e, Date.now() - t0);
  }
  const r = await read(resp);
  if (r.kind === 'final') return r.result;
  if (!r.tarefa) throw new FlowError('fluxo', 'O fluxo aceitou a conversão mas não informou o número da tarefa.');
  onTask?.(r.tarefa);
  return awaitTask(url, r.tarefa, signal, deadline, onProgress, t0);
}

/** Teste de conexão: o scope responde na hora, sem acionar o agente. */
export async function pingFlow(url: string, signal?: AbortSignal): Promise<PingResponse> {
  if (!url) throw new FlowError('config', 'Configure a URL do fluxo primeiro.');
  const t0 = performance.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  signal?.addEventListener('abort', () => ctrl.abort(), { once: true });
  try {
    const resp = await post(url, { ping: true, acao: 'ping', contrato: CONTRACT, app }, ctrl.signal);
    const ms = Math.round(performance.now() - t0);
    const text = (await resp.text()).trim();
    const obj = parseObj(text);
    if (obj && typeof obj.ok === 'boolean') {
      if (!obj.ok) throw new FlowError('fluxo', cleanMsg(String(obj.mensagem ?? 'O fluxo recusou o teste.')), cleanMsg(String(obj.detalhe ?? '')), resp.status);
      return {
        ok: true,
        versao: typeof obj.versao === 'string' ? obj.versao : null,
        agente: typeof obj.agente === 'string' ? obj.agente : null,
        limite: typeof obj.limite_caracteres === 'number' ? obj.limite_caracteres : null,
        modo: obj.modo === 'tarefa' ? 'tarefa' : 'sincrono',
        ms,
        envelope: true,
      };
    }
    if (!resp.ok) throw new FlowError('http', `O fluxo respondeu ${resp.status}.`, cleanMsg(text), resp.status);
    return { ok: true, versao: null, agente: null, limite: null, modo: null, ms, envelope: false };
  } catch (e) {
    if (e instanceof FlowError) throw e;
    if ((e as Error)?.name === 'AbortError') throw new FlowError('tempo', 'O fluxo não respondeu ao teste em 30 segundos.');
    throw networkError(e, 0);
  } finally {
    clearTimeout(timer);
  }
}
