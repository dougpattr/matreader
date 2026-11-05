import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useFlowStore } from '@/stores/flow';
import { useSettingsStore } from '@/stores/settings';
import { extractText } from '@/services/extract/text-extraction';
import { prepareDocument } from '@/services/flow/prepare-document';
import { convertWithFlow, pingFlow } from '@/services/flow/flow-client';

vi.mock('@/services/extract/text-extraction', () => ({ extractText: vi.fn() }));
vi.mock('@/services/flow/prepare-document', () => ({ prepareDocument: vi.fn() }));
vi.mock('@/services/pdf/pdf-service', () => ({ isSupported: () => true }));
vi.mock('@/stores/matricula', () => ({
  useMatriculaStore: () => ({ loadText: () => ({ ok: true }), data: { matricula: { numero: '123' } } }),
}));
vi.mock('@/services/flow/flow-client', async (original) => ({
  ...(await original<typeof import('@/services/flow/flow-client')>()),
  convertWithFlow: vi.fn(),
  pingFlow: vi.fn(),
}));

describe('conversão sem OCR local', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setActivePinia(createPinia());
    useSettingsStore().flowUrl = 'https://flow.test/';
    vi.mocked(pingFlow).mockResolvedValue({
      ok: true,
      leituraArquivo: true,
      versao: 'mat-flow/3.1',
      agente: 'teste',
      limite: 60000,
      modo: 'tarefa',
      ms: 1,
      envelope: true,
    });
    vi.mocked(prepareDocument).mockResolvedValue({
      filename: 'a.pdf',
      texto: '',
      paginas: 1,
      metodo_texto: 'ai-builder',
      ocr_confianca: null,
      sha256: null,
      base64Encoded: 'cGRm',
      leitura: 'fluxo',
    });
    vi.mocked(convertWithFlow).mockResolvedValue({
      raw: '{}',
      meta: { caracteres_recebidos: 500 },
      envelope: true,
      status: 200,
    });
  });

  it('envia arquivo mesmo com texto vazio e sendPdf=nunca, sem chamar extração local', async () => {
    useSettingsStore().sendPdf = 'nunca';
    const flow = useFlowStore();
    flow.lastText = 'texto antigo';
    flow.lastRaw = 'resposta antiga';
    await expect(flow.convert([new File([], 'a.pdf')])).resolves.toBe(true);
    expect(extractText).not.toHaveBeenCalled();
    expect(convertWithFlow).toHaveBeenCalledWith(
      'https://flow.test/',
      expect.objectContaining({ texto: '', base64Encoded: 'cGRm', leitura: 'fluxo' }),
      expect.any(AbortSignal),
      expect.any(Number),
      expect.any(Function),
      expect.any(Function),
    );
    expect(flow.lastText).toBe('');
    expect(flow.extracted?.chars).toBe(500);
    expect(flow.history[0]?.chars).toBe(500);
    expect(flow.busy).toBe(false);
  });

  it('orienta atualização do scope antigo sem executar OCR ou enviar documento', async () => {
    vi.mocked(pingFlow).mockResolvedValue({ ...(await pingFlow('')), leituraArquivo: false });
    const flow = useFlowStore();
    await expect(flow.convert([new File([], 'a.pdf')])).rejects.toThrow(/ainda não aceita/);
    expect(extractText).not.toHaveBeenCalled();
    expect(prepareDocument).not.toHaveBeenCalled();
    expect(convertWithFlow).not.toHaveBeenCalled();
    expect(flow.busy).toBe(false);
  });

  it('mantém leitura local como escolha explícita', async () => {
    const settings = useSettingsStore();
    settings.readingMode = 'local';
    settings.sendPdf = 'nunca';
    vi.mocked(extractText).mockResolvedValue({
      text: 'texto local',
      pages: 1,
      method: 'pdf-texto',
      chars: 11,
      ocrPages: 0,
      ocrConfidence: null,
      removedLines: 0,
    });
    await useFlowStore().convert([new File([], 'a.pdf')]);
    expect(extractText).toHaveBeenCalledOnce();
    expect(prepareDocument).not.toHaveBeenCalled();
    expect(pingFlow).not.toHaveBeenCalled();
    expect(convertWithFlow).toHaveBeenCalledWith(
      'https://flow.test/',
      expect.objectContaining({ leitura: 'local', texto: 'texto local' }),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it('migra preferências existentes sem perder URL e usa leitura no fluxo', () => {
    localStorage.setItem(
      'matreader:settings:v2',
      JSON.stringify({ flowUrl: 'https://antigo.test/', ocrMode: 'sempre', sendPdf: 'nunca' }),
    );
    setActivePinia(createPinia());
    expect(useSettingsStore()).toMatchObject({
      flowUrl: 'https://antigo.test/',
      readingMode: 'fluxo',
      ocrMode: 'sempre',
      sendPdf: 'nunca',
    });
  });
});
