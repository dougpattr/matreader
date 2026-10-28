/* OCR em WebAssembly (Tesseract) para páginas digitalizadas — roda no
   aparelho, com núcleo e idioma servidos de public/vendor (offline).
   Usa até 2 workers em paralelo e reaproveita o agendador entre envios. */
import type { Scheduler } from 'tesseract.js';
import { vendor } from '@/services/vendor';

export interface OcrResult {
  text: string;
  confidence: number;
}

type Status = (label: string, fraction: number) => void;

let schedulerP: Promise<Scheduler> | null = null;
let idleTimer: ReturnType<typeof setTimeout> | undefined;
let statusListener: Status | null = null;

function workerCount(): number {
  const cores = navigator.hardwareConcurrency || 2;
  return cores >= 4 ? 2 : 1;
}

async function scheduler(): Promise<Scheduler> {
  schedulerP ??= (async () => {
    const T = await import('tesseract.js');
    const sch = T.createScheduler();
    const n = workerCount();
    for (let i = 0; i < n; i++) {
      const w = await T.createWorker('por', T.OEM.LSTM_ONLY, {
        workerPath: vendor.ocrWorker,
        corePath: vendor.ocrCore,
        langPath: vendor.ocrLang,
        workerBlobURL: false,
        gzip: true,
        logger: (m: { status: string; progress: number }) => {
          if (m.status && /loading|initializ/.test(m.status)) {
            statusListener?.('Preparando o leitor de texto (OCR)', m.progress || 0);
          }
        },
      });
      sch.addWorker(w);
    }
    return sch;
  })().catch((e) => {
    schedulerP = null;
    throw e;
  });
  return schedulerP;
}

/** Lê o texto de uma imagem (página renderizada ou foto). */
export async function ocrImage(image: HTMLCanvasElement | Blob, onStatus?: Status): Promise<OcrResult> {
  clearTimeout(idleTimer);
  statusListener = onStatus ?? null;
  const sch = await scheduler();
  const res = (await sch.addJob('recognize', image)) as { data: { text: string; confidence: number } };
  scheduleIdleShutdown();
  return { text: res.data.text ?? '', confidence: Number(res.data.confidence) || 0 };
}

/** Libera a memória do OCR depois de 2 minutos sem uso. */
function scheduleIdleShutdown(): void {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => void terminateOcr(), 120_000);
}

export async function terminateOcr(): Promise<void> {
  const p = schedulerP;
  schedulerP = null;
  if (p) {
    try {
      await (await p).terminate();
    } catch {}
  }
}
