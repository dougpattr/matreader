/* Impressão: só o documento vai para a folha, com o croqui do terreno.
   O documento é montado numa raiz própria, fora do Ionic, para que a
   paginação do navegador funcione (o Ionic usa rolagem interna). */
import { renderDocument } from '@/features/document/render-document';
import { croquiDataUrl } from '@/features/terrain/paint';
import { useMatriculaStore } from '@/stores/matricula';

function root(): HTMLElement {
  let el = document.getElementById('print-root');
  if (!el) {
    el = document.createElement('div');
    el.id = 'print-root';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
  }
  return el;
}

let savedTitle = '';

export function preparePrint(): boolean {
  const mat = useMatriculaStore();
  if (!mat.data) return false;
  const croqui = croquiDataUrl(mat.points, mat.geo.kind, mat.geo.labels, mat.data.dados_geoespaciais);
  const { html } = renderDocument(mat.data, { demo: mat.isDemo, summary: mat.summary, checks: mat.checks, croqui, forPrint: true });
  root().innerHTML = `<article class="doc doc--print">${html}</article>`;
  savedTitle = document.title;
  if (mat.data.matricula.numero) document.title = `Matrícula ${mat.data.matricula.numero}`;
  return true;
}

function cleanup() {
  root().innerHTML = '';
  if (savedTitle) document.title = savedTitle;
}

export function installPrintHooks(): void {
  addEventListener('beforeprint', () => {
    if (!root().innerHTML) preparePrint(); // Ctrl+P do navegador
  });
  addEventListener('afterprint', cleanup);
}

export function printDocument(): boolean {
  if (!preparePrint()) return false;
  setTimeout(() => window.print(), 80);
  return true;
}
