/* Do arquivo ao texto que o agente lê: camada de texto do PDF quando
   existe, OCR (WebAssembly) nas páginas digitalizadas e nas fotos.
   Decide página por página — certidões costumam misturar as duas. */
import { isPdf, extractPdfText, openPdf, renderPage, type Progress } from '@/services/pdf/pdf-service';
import { ocrImage } from '@/services/ocr/ocr-service';
import { cleanText } from './clean-text';

export type OcrMode = 'auto' | 'sempre' | 'nunca';
export type TextMethod = 'pdf-texto' | 'ocr' | 'misto' | 'nenhum';

export interface ExtractedText {
  text: string;
  pages: number;
  method: TextMethod;
  ocrPages: number;
  /** confiança média do OCR (0–100), quando usado */
  ocrConfidence: number | null;
  chars: number;
  removedLines: number;
}

/** Abaixo disso a página é tratada como digitalizada. */
const MIN_CHARS_PAGE = 60;
/** ~300 dpi numa folha A4 — o ponto bom para o Tesseract. */
const OCR_WIDTH_PX = 2400;

export async function extractText(files: File[], mode: OcrMode, onProgress: Progress, signal?: AbortSignal): Promise<ExtractedText> {
  const pages: { text: string; ocr: boolean; conf: number | null }[] = [];
  let totalUnits = 0;
  let doneUnits = 0;
  const tick = (label: string) => onProgress(totalUnits ? Math.min(0.99, doneUnits / totalUnits) : 0, label);

  // estimativa de trabalho para a barra de progresso (1 unidade por página)
  const docs: { file: File; pdf: Awaited<ReturnType<typeof openPdf>> | null }[] = [];
  for (const f of files) {
    if (isPdf(f)) {
      const pdf = await openPdf(await f.arrayBuffer());
      totalUnits += pdf.numPages;
      docs.push({ file: f, pdf });
    } else {
      totalUnits += 1;
      docs.push({ file: f, pdf: null });
    }
  }

  try {
    for (const { file, pdf } of docs) {
      signal?.throwIfAborted();
      if (!pdf) {
        if (mode === 'nunca') {
          pages.push({ text: '', ocr: false, conf: null });
        } else {
          tick(`Lendo a foto ${file.name} (OCR)`);
          const r = await ocrImage(file, (l) => tick(l));
          pages.push({ text: r.text, ocr: true, conf: r.confidence });
        }
        doneUnits++;
        continue;
      }
      const layer = mode === 'sempre' ? [] : await extractPdfText(pdf);
      for (let i = 1; i <= pdf.numPages; i++) {
        signal?.throwIfAborted();
        const native = layer[i - 1];
        if (native && native.chars >= MIN_CHARS_PAGE) {
          pages.push({ text: native.text, ocr: false, conf: null });
        } else if (mode === 'nunca') {
          pages.push({ text: native?.text ?? '', ocr: false, conf: null });
        } else {
          tick(`Lendo a página ${doneUnits + 1} de ${totalUnits} com OCR`);
          const first = await pdf.getPage(i);
          const scale = Math.min(4, OCR_WIDTH_PX / first.getViewport({ scale: 1 }).width);
          const cv = await renderPage(pdf, i, scale);
          const r = await ocrImage(cv, (l) => tick(l));
          pages.push({ text: r.text, ocr: true, conf: r.confidence });
          cv.width = cv.height = 0; // libera memória do canvas
        }
        doneUnits++;
        tick(`Página ${doneUnits} de ${totalUnits}`);
      }
    }
  } finally {
    docs.forEach((d) => void d.pdf?.destroy());
  }

  const ocrPages = pages.filter((p) => p.ocr);
  const confs = ocrPages.map((p) => p.conf).filter((c): c is number => c !== null);
  const cleaned = cleanText(pages.map((p) => p.text));
  const method: TextMethod = !cleaned.text.trim()
    ? 'nenhum'
    : ocrPages.length === 0
      ? 'pdf-texto'
      : ocrPages.length === pages.length
        ? 'ocr'
        : 'misto';
  onProgress(1, 'Texto pronto');
  return {
    text: cleaned.text,
    pages: pages.length,
    method,
    ocrPages: ocrPages.length,
    ocrConfidence: confs.length ? Math.round(confs.reduce((a, b) => a + b, 0) / confs.length) : null,
    chars: cleaned.text.length,
    removedLines: cleaned.removedLines,
  };
}

export const METHOD_LABEL: Record<TextMethod, string> = {
  'pdf-texto': 'texto do próprio PDF',
  ocr: 'OCR (página digitalizada)',
  misto: 'texto do PDF + OCR',
  nenhum: 'nenhum texto encontrado',
};
