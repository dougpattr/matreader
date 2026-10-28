/* PDF no aparelho: juntar, limpar links, rasterizar, contar páginas, gerar
   miniaturas e extrair texto. pdf.js (com decodificadores WebAssembly) e
   pdf-lib só carregam quando o primeiro arquivo chega. */
import type { PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { yieldToUi } from '@/core/browser';
import { vendor } from '@/services/vendor';

type PdfJs = typeof import('pdfjs-dist');
type PdfLib = typeof import('pdf-lib');

let pdfjsP: Promise<PdfJs> | null = null;
let pdfLibP: Promise<PdfLib> | null = null;

export function pdfjs(): Promise<PdfJs> {
  pdfjsP ??= import('pdfjs-dist').then((m) => {
    m.GlobalWorkerOptions.workerSrc = workerUrl;
    return m;
  });
  return pdfjsP;
}

export function pdfLib(): Promise<PdfLib> {
  pdfLibP ??= import('pdf-lib');
  return pdfLibP;
}

export type Progress = (fraction: number, label: string) => void;

const EXT_OK = /\.(pdf|jpe?g|png|jfif|webp|bmp)$/i;
export const isPdf = (f: File) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
export const isImage = (f: File) => f.type.startsWith('image/') || /\.(jpe?g|png|jfif|webp|bmp)$/i.test(f.name);
export const isSupported = (f: File) => EXT_OK.test(f.name) || isPdf(f) || isImage(f);
export const isJson = (f: File) => /\.json$/i.test(f.name) || f.type === 'application/json';

/** pdf.js transfere o buffer para o worker: sempre passe uma cópia. */
export async function openPdf(data: ArrayBuffer | Uint8Array): Promise<PDFDocumentProxy> {
  const lib = await pdfjs();
  const copy = data instanceof Uint8Array ? data.slice() : new Uint8Array(data.slice(0));
  return lib.getDocument({
    data: copy,
    wasmUrl: vendor.pdfWasm,
    standardFontDataUrl: vendor.pdfFonts,
    iccUrl: vendor.pdfIcc,
  }).promise;
}

function canvasFor(w: number, h: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w));
  cv.height = Math.max(1, Math.round(h));
  return cv;
}

/** Renderiza a página (1-based) numa tela branca. */
export async function renderPage(pdf: PDFDocumentProxy, pageNo: number, scale: number): Promise<HTMLCanvasElement> {
  const page = await pdf.getPage(pageNo);
  const vp = page.getViewport({ scale });
  const cv = canvasFor(vp.width, vp.height);
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, cv.width, cv.height);
  await page.render({ canvas: cv, canvasContext: ctx, viewport: vp }).promise;
  page.cleanup();
  return cv;
}

export async function pdfInfo(file: File): Promise<{ pages: number; thumb: string | null }> {
  const pdf = await openPdf(await file.arrayBuffer());
  try {
    const first = await pdf.getPage(1);
    const scale = 120 / first.getViewport({ scale: 1 }).width;
    const cv = await renderPage(pdf, 1, scale);
    return { pages: pdf.numPages, thumb: cv.toDataURL('image/jpeg', 0.7) };
  } finally {
    void pdf.destroy();
  }
}

async function imageToJpeg(file: Blob, quality = 0.88): Promise<Uint8Array> {
  const bmp = await createImageBitmap(file);
  const cv = canvasFor(bmp.width, bmp.height);
  cv.getContext('2d')!.drawImage(bmp, 0, 0);
  bmp.close();
  const blob = await new Promise<Blob>((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('falha ao converter imagem'))), 'image/jpeg', quality));
  return new Uint8Array(await blob.arrayBuffer());
}

/** Junta PDFs e imagens (na ordem dada) num PDF só. */
export async function mergeFiles(files: File[], onProgress?: Progress): Promise<Uint8Array> {
  const { PDFDocument } = await pdfLib();
  if (files.length === 1 && isPdf(files[0]!)) return new Uint8Array(await files[0]!.arrayBuffer());
  const doc = await PDFDocument.create();
  for (let i = 0; i < files.length; i++) {
    const f = files[i]!;
    onProgress?.(i / files.length, `Juntando ${i + 1} de ${files.length}`);
    const buf = await f.arrayBuffer();
    if (isPdf(f)) {
      const src = await PDFDocument.load(buf, { ignoreEncryption: true });
      const pages = await doc.copyPages(src, src.getPageIndices());
      pages.forEach((p) => doc.addPage(p));
    } else {
      const png = /png$/i.test(f.type) || /\.png$/i.test(f.name);
      let img;
      try {
        img = png ? await doc.embedPng(buf) : await doc.embedJpg(buf);
      } catch {
        img = await doc.embedJpg(await imageToJpeg(f));
      }
      const page = doc.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    }
    await yieldToUi();
  }
  return doc.save();
}

/** Remove anotações (links, botões, campos) de todas as páginas. */
export async function stripAnnotations(bytes: Uint8Array): Promise<{ bytes: Uint8Array; pages: number }> {
  const { PDFDocument, PDFName } = await pdfLib();
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const annots = PDFName.of('Annots');
  for (const p of doc.getPages()) if (p.node.has(annots)) p.node.delete(annots);
  return { bytes: await doc.save(), pages: doc.getPageCount() };
}

export interface RasterOptions {
  targetWidth?: number;
  jpegQuality?: number;
}

/** Cada página vira imagem: some link, campo e texto selecionável. */
export async function rasterize(bytes: Uint8Array, opts: RasterOptions = {}, onProgress?: Progress): Promise<Uint8Array> {
  const { PDFDocument } = await pdfLib();
  const src = await openPdf(bytes);
  try {
    const n = src.numPages;
    let width = opts.targetWidth;
    let quality = opts.jpegQuality;
    if (!width) {
      if (n <= 10) [width, quality] = [1654, 0.68];
      else if (n <= 30) [width, quality] = [1300, 0.58];
      else [width, quality] = [1000, 0.48];
    }
    const out = await PDFDocument.create();
    for (let i = 1; i <= n; i++) {
      onProgress?.(i / n, `Processando página ${i} de ${n}`);
      const page = await src.getPage(i);
      const scale = Math.max(0.5, Math.min(2.5, width / page.getViewport({ scale: 1 }).width));
      const cv = await renderPage(src, i, scale);
      const blob = await new Promise<Blob>((res) => cv.toBlob((b) => res(b!), 'image/jpeg', quality ?? 0.6));
      const img = await out.embedJpg(await blob.arrayBuffer());
      out.addPage([img.width, img.height]).drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      await yieldToUi();
    }
    return out.save();
  } finally {
    void src.destroy();
  }
}

export interface PageText {
  page: number;
  text: string;
  chars: number;
}

/** Texto de cada página, reconstruindo linhas pela posição vertical. */
export async function extractPdfText(pdf: PDFDocumentProxy, onProgress?: Progress): Promise<PageText[]> {
  const out: PageText[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.(i / pdf.numPages, `Lendo o texto da página ${i} de ${pdf.numPages}`);
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    const rows = new Map<number, { x: number; s: string }[]>();
    for (const it of tc.items) {
      if (!('str' in it) || !it.str) continue;
      const y = Math.round(it.transform[5] / 3) * 3; // agrupa itens da mesma linha
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y)!.push({ x: it.transform[4], s: it.str });
    }
    const text = [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, items]) =>
        items
          .sort((a, b) => a.x - b.x)
          .map((t) => t.s)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim(),
      )
      .filter(Boolean)
      .join('\n');
    out.push({ page: i, text, chars: text.replace(/\s/g, '').length });
    page.cleanup();
    await yieldToUi();
  }
  return out;
}

export function toBase64(bytes: Uint8Array): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onloadend = () => resolve(String(fr.result).split(',')[1] ?? '');
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
  });
}
