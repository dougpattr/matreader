/* Endereços dos recursos locais (public/vendor) — respeitam a subpasta de
   publicação (BASE_URL), então funcionam em /, em /matreader/ e offline. */
const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');

export const vendor = {
  pdfWasm: `${base}vendor/pdfjs/wasm/`,
  pdfFonts: `${base}vendor/pdfjs/standard_fonts/`,
  pdfIcc: `${base}vendor/pdfjs/iccs/`,
  ocrWorker: `${base}vendor/ocr/worker.min.js`,
  ocrCore: `${base}vendor/ocr/core`,
  ocrLang: `${base}vendor/ocr/lang`,
};

/** Arquivos que "Preparar uso offline" baixa para o cache do service worker. */
export const offlineAssets = [
  vendor.ocrWorker,
  `${vendor.ocrCore}/tesseract-core-simd-lstm.wasm.js`,
  `${vendor.ocrCore}/tesseract-core-lstm.wasm.js`,
  `${vendor.ocrLang}/por.traineddata.gz`,
  `${vendor.pdfWasm}openjpeg.wasm`,
  `${vendor.pdfWasm}jbig2.wasm`,
  `${vendor.pdfWasm}qcms_bg.wasm`,
  `${vendor.pdfFonts}FoxitSerif.pfb`,
  `${vendor.pdfFonts}FoxitSerifBold.pfb`,
  `${vendor.pdfFonts}FoxitFixed.pfb`,
  `${vendor.pdfFonts}LiberationSans-Regular.ttf`,
  `${vendor.pdfFonts}LiberationSans-Bold.ttf`,
];
