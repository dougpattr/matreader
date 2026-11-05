import { sha256Hex } from '@/core/browser';
import { isPdf, mergeFiles, pdfLib, toBase64, type Progress } from '@/services/pdf/pdf-service';
import { FlowError, type ConvertRequest } from './flow-client';

// Limites do reconhecimento de texto do AI Builder. Nunca reduzir qualidade
// ou enviar só as primeiras páginas para contornar estes limites.
export const MAX_DOCUMENT_BYTES = 20_000_000;
export const MAX_DOCUMENT_PAGES = 2000;

export async function prepareDocument(
  files: File[],
  onProgress: Progress,
  signal: AbortSignal,
): Promise<ConvertRequest> {
  signal.throwIfAborted();
  if (files.some((f) => f.size > MAX_DOCUMENT_BYTES)) {
    throw new FlowError(
      'config',
      'O arquivo excede o limite de 20 MB do AI Builder.',
      '',
      0,
      'Divida o documento antes de enviar. A qualidade não será reduzida automaticamente.',
    );
  }
  const bytes = await mergeFiles(files, onProgress, true);
  signal.throwIfAborted();
  if (bytes.byteLength > MAX_DOCUMENT_BYTES) {
    throw new FlowError(
      'config',
      'O PDF unificado excede o limite de 20 MB do AI Builder.',
      '',
      0,
      'Envie menos arquivos por vez.',
    );
  }
  const { PDFDocument } = await pdfLib();
  const doc = await PDFDocument.load(bytes);
  const pages = doc.getPageCount();
  if (!pages || pages > MAX_DOCUMENT_PAGES) {
    throw new FlowError(
      'config',
      'O AI Builder aceita de 1 a 2.000 páginas por envio.',
      '',
      0,
      'Divida o documento para que nenhuma página seja ignorada.',
    );
  }
  const base64Encoded = await toBase64(bytes);
  const sha256 = await sha256Hex(bytes);
  signal.throwIfAborted();
  return {
    filename: files.length === 1 && isPdf(files[0]!) ? files[0]!.name : 'documentos_unificados.pdf',
    texto: '',
    paginas: pages,
    metodo_texto: 'ai-builder',
    ocr_confianca: null,
    leitura: 'fluxo',
    mime_type: 'application/pdf',
    base64Encoded,
    sha256,
  };
}
