/* Cliente do fluxo do Power Automate (gatilho HTTP → agente do Copilot
   Studio → Resposta). Contrato "matreader/fluxo@2":
     pedido  { contrato, app, filename, texto, paginas, metodo_texto,
               ocr_confianca, caracteres, sha256, base64Encoded? }
     resposta{ ok:true, versao, resposta:"<texto do agente>", meta:{…} }
            | { ok:false, mensagem, detalhe, etapa }
   Também aceita o fluxo antigo (resposta = o JSON da matrícula direto) e
   a resposta assíncrona (202 + Location), consultando até concluir. */
import { sleep } from '@/core/browser';
import type { FlowMeta } from '@/domain/matricula/types';

export const CONTRACT = 'matreader/fluxo@2';
export const APP_VERSION = '4.0.0';

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
  ms: number;
  envelope: boolean;
}

const SYNC_LIMIT_MS = 115_000;

function cleanMsg(s: string, max = 220): string {
  return String(s)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function parseObj(text: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(text);
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function post(url: string, body: unknown, signal: AbortSignal): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
}

/** Resposta assíncrona do Power Automate: 202 + Location até concluir. */
async function follow(resp: Response, signal: AbortSignal, deadline: number): Promise<Response> {
  let r = resp;
  while (r.status === 202) {
    const loc = r.headers.get('Location') ?? r.headers.get('location');
    if (!loc) {
      throw new FlowError('fluxo', 'O fluxo respondeu 202 (resposta assíncrona) sem endereço de acompanhamento.', '',
        202, 'Desligue "Resposta assíncrona" na ação Responder do fluxo, ou exponha o cabeçalho Location.');
    }
    if (Date.now() > deadline) throw new FlowError('tempo', 'O fluxo passou do tempo-limite configurado.');
    await sleep(4000);
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
      'O fluxo continua trabalhando: se o scope do MatReader estiver instalado, o resultado chega no seu chat do Teams (Flow bot). Cole o JSON aqui com "Colar JSON".');
  }
  return new FlowError('rede', 'Não consegui falar com o fluxo.', String((e as Error)?.message ?? e), 0,
    'Confira a internet, a URL em Configurações e se o gatilho HTTP aceita "Qualquer pessoa".');
}

export async function convertWithFlow(
  url: string,
  req: ConvertRequest,
  signal: AbortSignal,
  timeoutMs = 300_000,
): Promise<ConvertResponse> {
  if (!url) throw new FlowError('config', 'Configure a URL do fluxo em Configurações.');
  const t0 = Date.now();
  let resp: Response;
  try {
    resp = await post(url, { contrato: CONTRACT, app: { nome: 'MatReader', versao: APP_VERSION }, caracteres: req.texto.length, ...req }, signal);
    resp = await follow(resp, signal, t0 + timeoutMs);
  } catch (e) {
    throw networkError(e, Date.now() - t0);
  }
  const text = ((await resp.text()) || '').trim();
  const obj = parseObj(text);
  const isEnvelope = !!obj && typeof obj.ok === 'boolean';

  if (isEnvelope && obj!.ok === false) {
    throw new FlowError('fluxo', cleanMsg(String(obj!.mensagem ?? 'O fluxo informou uma falha.')), cleanMsg(String(obj!.detalhe ?? ''), 400),
      resp.status, obj!.etapa ? `Etapa: ${String(obj!.etapa)}` : '');
  }
  if (!resp.ok) {
    const msg = obj?.mensagem ? `${obj.mensagem}${obj.detalhe ? ` (${obj.detalhe})` : ''}` : text;
    throw new FlowError('http', `O fluxo respondeu ${resp.status}.`, cleanMsg(String(msg)), resp.status);
  }
  if (!text) throw new FlowError('vazio', 'O fluxo respondeu vazio.', '', resp.status, 'Confira se o fluxo termina com a ação Responder devolvendo o resultado.');

  if (isEnvelope) {
    const r = obj!.resposta;
    const raw = typeof r === 'string' ? r : r ? JSON.stringify(r) : '';
    if (!raw.trim()) throw new FlowError('vazio', 'O agente concluiu sem conteúdo.', '', resp.status, 'Veja o histórico de execuções do fluxo, ação Execute Agent and wait.');
    const meta = (obj!.meta && typeof obj!.meta === 'object' ? obj!.meta : null) as FlowMeta | null;
    if (meta && typeof obj!.versao === 'string') meta.versao = obj!.versao;
    return { raw, meta, envelope: true, status: resp.status };
  }
  return { raw: text, meta: null, envelope: false, status: resp.status };
}

/** Teste de conexão: o scope responde na hora, sem acionar o agente. */
export async function pingFlow(url: string, signal?: AbortSignal): Promise<PingResponse> {
  if (!url) throw new FlowError('config', 'Configure a URL do fluxo primeiro.');
  const t0 = performance.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  signal?.addEventListener('abort', () => ctrl.abort(), { once: true });
  try {
    const resp = await post(url, { ping: true, contrato: CONTRACT, app: { nome: 'MatReader', versao: APP_VERSION } }, ctrl.signal);
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
        ms,
        envelope: true,
      };
    }
    if (!resp.ok) throw new FlowError('http', `O fluxo respondeu ${resp.status}.`, cleanMsg(text), resp.status);
    // fluxo antigo: respondeu, mas não conhece o ping
    return { ok: true, versao: null, agente: null, limite: null, ms, envelope: false };
  } catch (e) {
    if (e instanceof FlowError) throw e;
    if ((e as Error)?.name === 'AbortError') throw new FlowError('tempo', 'O fluxo não respondeu ao teste em 30 segundos.');
    throw networkError(e, 0);
  } finally {
    clearTimeout(timer);
  }
}
