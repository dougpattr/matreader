// Gera os ícones do PWA a partir de SVG, renderizando com resvg em
// WebAssembly (sem dependência nativa). Saída em public/icons/.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initWasm, Resvg } from '@resvg/resvg-wasm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'icons');
mkdirSync(out, { recursive: true });

const require = createRequire(import.meta.url);
await initWasm(readFileSync(require.resolve('@resvg/resvg-wasm/index_bg.wasm')));

// A janela em arco com o "M" de nanquim e a estaca rosa — a marca do app.
const mark = (pad) => {
  const s = 512 - pad * 2;
  const k = s / 512;
  const t = (x, y) => `${(pad + x * k).toFixed(1)} ${(pad + y * k).toFixed(1)}`;
  return `
    <path d="M${t(120, 430)}V${pad + 236 * k}A${136 * k} ${150 * k} 0 0 1 ${t(392, 236)}V${pad + 430 * k}Z" fill="#f4ede3" stroke="#24222b" stroke-width="${12 * k}" stroke-linejoin="round"/>
    <path d="M${t(152, 410)}V${pad + 240 * k}A${104 * k} ${116 * k} 0 0 1 ${t(360, 240)}V${pad + 410 * k}" fill="none" stroke="#24222b" stroke-opacity=".35" stroke-width="${4 * k}"/>
    <path d="M${t(180, 372)}V${pad + 218 * k}c${36 * k} ${22 * k} ${50 * k} ${34 * k} ${76 * k} ${56 * k}c${26 * k} ${-22 * k} ${40 * k} ${-34 * k} ${76 * k} ${-56 * k}V${pad + 372 * k}" fill="none" stroke="#5f6787" stroke-width="${30 * k}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M${t(256, 384)}c${-1 * k} ${-30 * k} ${1 * k} ${-58 * k} 0 ${-86 * k}" fill="none" stroke="#974a40" stroke-width="${16 * k}" stroke-linecap="round"/>`;
};

const svgAny = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#5f6787"/>
  <rect x="18" y="18" width="476" height="476" rx="96" fill="none" stroke="#f4ede3" stroke-opacity=".55" stroke-width="6"/>
  ${mark(0)}
</svg>`;

const svgMaskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#5f6787"/>
  ${mark(64)}
</svg>`;

writeFileSync(join(out, 'icon.svg'), svgAny);
const render = (svg, size) => new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
writeFileSync(join(out, 'icon-192.png'), render(svgAny, 192));
writeFileSync(join(out, 'icon-512.png'), render(svgAny, 512));
writeFileSync(join(out, 'icon-maskable-512.png'), render(svgMaskable, 512));
writeFileSync(join(out, 'apple-touch-icon.png'), render(svgMaskable, 180));
console.log('[icons] ícones gerados em public/icons/');
