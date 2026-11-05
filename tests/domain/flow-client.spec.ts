import { afterEach, describe, expect, it, vi } from 'vitest';
import { convertWithFlow, pingFlow, FlowError, type ConvertRequest } from '@/services/flow/flow-client';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const pedido: ConvertRequest = {
  filename: 'm.pdf',
  texto: 'MATRÍCULA 1 '.repeat(30),
  paginas: 1,
  metodo_texto: 'pdf-texto',
  ocr_confianca: null,
  sha256: null,
};
const b64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));

describe('fluxo@3 — protocolo por tarefa', () => {
  it('só anuncia leitura de arquivos quando o ping confirma a capacidade', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ ok: true, pong: true, leitura_arquivo: true, versao: 'mat-flow/3.1' })),
    );
    expect((await pingFlow('https://fluxo.test/')).leituraArquivo).toBe(true);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ ok: true, pong: true, versao: 'mat-flow/3.0' })),
    );
    expect((await pingFlow('https://fluxo.test/')).leituraArquivo).toBe(false);
  });

  it('envia documento sem texto local e recebe a falha do AI Builder pela tarefa', async () => {
    vi.useFakeTimers();
    const bodies: Record<string, unknown>[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body));
        bodies.push(body);
        return body.acao === 'converter'
          ? json({ ok: true, status: 'processando', tarefa: 'OCR' })
          : json({ ok: false, status: 'erro', mensagem: 'Falha na leitura.', etapa: 'Processar_documento' });
      }),
    );
    const promise = convertWithFlow(
      'https://fluxo.test/',
      { ...pedido, texto: '', leitura: 'fluxo', base64Encoded: 'cGRm' },
      new AbortController().signal,
    );
    const check = expect(promise).rejects.toMatchObject({
      kind: 'fluxo',
      hint: 'Etapa: Processar_documento',
    });
    await vi.advanceTimersByTimeAsync(5000);
    await check;
    expect(bodies[0]).toMatchObject({ texto: '', caracteres: 0, leitura: 'fluxo', base64Encoded: 'cGRm' });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('aceita a tarefa, consulta até o resultado (embrulhado em base64 pelo OneDrive) e conclui', async () => {
    vi.useFakeTimers();
    const acoes: string[] = [];
    let consultas = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body)) as { acao: string; tarefa?: string };
        acoes.push(body.tarefa ? `${body.acao}:${body.tarefa}` : body.acao);
        if (body.acao === 'converter')
          return json({ ok: true, status: 'processando', tarefa: 'T1', versao: 'mat-flow/3.0' });
        if (body.acao === 'consultar' && ++consultas < 2) return json({ ok: true, status: 'processando' });
        if (body.acao === 'consultar') {
          const final = {
            ok: true,
            versao: 'mat-flow/3.0',
            resposta: '{"matricula":{"numero":"77.701"}}',
            meta: { agente: 'teste' },
          };
          return json({ '$content-type': 'application/octet-stream', $content: b64(JSON.stringify(final)) });
        }
        return json({ ok: true, status: 'apagada' });
      }),
    );

    const tarefas: string[] = [];
    const progresso: number[] = [];
    const p = convertWithFlow(
      'https://fluxo.test/',
      pedido,
      new AbortController().signal,
      600_000,
      (t) => tarefas.push(t),
      (x) => progresso.push(x.consultas),
    );
    await vi.advanceTimersByTimeAsync(5000); // 1ª consulta: ainda processando
    await vi.advanceTimersByTimeAsync(5000); // 2ª consulta: pronto
    const r = await p;

    expect(tarefas).toEqual(['T1']);
    expect(progresso).toEqual([1]);
    expect(r.envelope).toBe(true);
    expect(r.raw).toContain('"numero":"77.701"');
    expect(r.meta?.versao).toBe('mat-flow/3.0');
    expect(acoes).toEqual(['converter', 'consultar:T1', 'consultar:T1', 'concluir:T1']);
  });

  it('falha gravada pelo fluxo chega como erro do fluxo, com a etapa', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        const { acao } = JSON.parse(String(init.body)) as { acao: string };
        if (acao === 'converter') return json({ ok: true, status: 'processando', tarefa: 'T2' });
        return json({
          ok: false,
          mensagem: 'O agente não respondeu.',
          detalhe: 'timeout',
          etapa: 'Execute_Agent_and_wait',
        });
      }),
    );
    const p = convertWithFlow('https://fluxo.test/', pedido, new AbortController().signal);
    const check = expect(p).rejects.toMatchObject({ kind: 'fluxo', hint: 'Etapa: Execute_Agent_and_wait' });
    await vi.advanceTimersByTimeAsync(5000);
    await check;
  });

  it('o 504 do scope síncrono antigo vira erro de tempo com a dica de atualizar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json(
          {
            code: 'UnexpectedError',
            message:
              "The execution of template action 'Responder_sucesso' is failed: the client application timed out",
          },
          504,
        ),
      ),
    );
    const err = await convertWithFlow('https://fluxo.test/', pedido, new AbortController().signal).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(FlowError);
    expect((err as FlowError).kind).toBe('tempo');
    expect((err as FlowError).hint).toMatch(/fluxo@3/);
  });
});
