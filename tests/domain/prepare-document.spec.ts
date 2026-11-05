import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { prepareDocument, MAX_DOCUMENT_BYTES } from '@/services/flow/prepare-document';
import { mergeFiles, pdfLib, toBase64 } from '@/services/pdf/pdf-service';

vi.mock('@/services/pdf/pdf-service', () => ({
  isPdf: (f: File) => f.name.endsWith('.pdf'),
  mergeFiles: vi.fn(),
  pdfLib: vi.fn(),
  toBase64: vi.fn(),
}));
vi.mock('@/core/browser', () => ({ sha256Hex: vi.fn(async () => 'hash-do-arquivo') }));

describe('preparação para leitura no fluxo', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(pdfLib).mockResolvedValue({ PDFDocument } as Awaited<ReturnType<typeof pdfLib>>);
    vi.mocked(toBase64).mockImplementation(async (bytes) => btoa(String.fromCharCode(...bytes)));
  });

  it('envia o PDF integral sem extração de texto, inclusive páginas em branco', async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    pdf.addPage();
    const bytes = await pdf.save();
    vi.mocked(mergeFiles).mockResolvedValue(bytes);
    const file = new File(['pdf'], 'matricula.pdf', { type: 'application/pdf' });
    const result = await prepareDocument([file], vi.fn(), new AbortController().signal);
    expect(result).toMatchObject({
      filename: 'matricula.pdf',
      texto: '',
      paginas: 2,
      leitura: 'fluxo',
      metodo_texto: 'ai-builder',
      ocr_confianca: null,
    });
    expect(Uint8Array.from(atob(result.base64Encoded!), (c) => c.charCodeAt(0))).toEqual(bytes);
    expect(mergeFiles).toHaveBeenCalledWith([file], expect.any(Function), true);
  });

  it('usa nome e MIME de PDF ao unificar fotos', async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    vi.mocked(mergeFiles).mockResolvedValue(await pdf.save());
    const result = await prepareDocument(
      [new File(['foto'], 'foto.png')],
      vi.fn(),
      new AbortController().signal,
    );
    expect(result).toMatchObject({ filename: 'documentos_unificados.pdf', mime_type: 'application/pdf' });
  });

  it('rejeita arquivo grande antes de carregá-lo', async () => {
    const file = new File([], 'grande.pdf');
    Object.defineProperty(file, 'size', { value: MAX_DOCUMENT_BYTES + 1 });
    await expect(prepareDocument([file], vi.fn(), new AbortController().signal)).rejects.toThrow(/20 MB/);
    expect(mergeFiles).not.toHaveBeenCalled();
  });

  it('rejeita PDF unificado grande sem comprimir', async () => {
    vi.mocked(mergeFiles).mockResolvedValue(new Uint8Array(MAX_DOCUMENT_BYTES + 1));
    await expect(
      prepareDocument([new File([], 'a.pdf')], vi.fn(), new AbortController().signal),
    ).rejects.toThrow(/20 MB/);
    expect(toBase64).not.toHaveBeenCalled();
  });

  it('impede perda das páginas acima do limite do AI Builder', async () => {
    const pdf = await PDFDocument.create();
    for (let i = 0; i < 2001; i++) pdf.addPage();
    vi.mocked(mergeFiles).mockResolvedValue(await pdf.save());
    await expect(
      prepareDocument([new File([], 'a.pdf')], vi.fn(), new AbortController().signal),
    ).rejects.toThrow(/2.000 páginas/);
    expect(toBase64).not.toHaveBeenCalled();
  });

  it('respeita cancelamento antes da preparação', async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(prepareDocument([], vi.fn(), ctrl.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(mergeFiles).not.toHaveBeenCalled();
  });
});
