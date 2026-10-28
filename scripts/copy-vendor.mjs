// Copia de node_modules para public/vendor os recursos que precisam ser
// servidos como arquivos (e não empacotados pelo Vite): núcleo WebAssembly
// do Tesseract, dados de idioma do OCR e os decodificadores/fontes do pdf.js.
// Assim o app não depende de CDN e funciona offline.
import { cpSync, existsSync, mkdirSync, statSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const nm = (...p) => join(root, 'node_modules', ...p);
const out = (...p) => join(root, 'public', 'vendor', ...p);

const copies = [
  // OCR (Tesseract em WebAssembly) — só as variantes LSTM, com e sem SIMD
  [nm('tesseract.js', 'dist', 'worker.min.js'), out('ocr', 'worker.min.js')],
  [nm('tesseract.js-core', 'tesseract-core-simd-lstm.wasm.js'), out('ocr', 'core', 'tesseract-core-simd-lstm.wasm.js')],
  [nm('tesseract.js-core', 'tesseract-core-lstm.wasm.js'), out('ocr', 'core', 'tesseract-core-lstm.wasm.js')],
  [nm('@tesseract.js-data', 'por', '4.0.0_best_int', 'por.traineddata.gz'), out('ocr', 'lang', 'por.traineddata.gz')],
  // pdf.js: decodificadores WebAssembly (JPEG 2000, JBIG2, cores ICC) e fontes padrão
  [nm('pdfjs-dist', 'wasm'), out('pdfjs', 'wasm')],
  [nm('pdfjs-dist', 'standard_fonts'), out('pdfjs', 'standard_fonts')],
  [nm('pdfjs-dist', 'iccs'), out('pdfjs', 'iccs')],
];

let total = 0;
for (const [from, to] of copies) {
  if (!existsSync(from)) {
    console.error(`[vendor] não encontrado: ${from} — rode "npm install".`);
    process.exit(1);
  }
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true });
  total += size(to);
}
console.log(`[vendor] ${copies.length} recursos copiados para public/vendor (${(total / 1024 / 1024).toFixed(1)} MB).`);

function size(p) {
  const st = statSync(p);
  if (!st.isDirectory()) return st.size;
  return readdirSync(p).reduce((s, f) => s + size(join(p, f)), 0);
}
