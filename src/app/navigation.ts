/* Ir para um bloco: no desktop rola o painel até ele; no celular troca de
   aba (rota) e rola dentro dela. */
import type { Router } from 'vue-router';
import { prefersReducedMotion } from '@/core/browser';
import type { PanelId } from '@/stores/ui';

export type TabId = 'inicio' | 'documento' | 'terreno' | 'arquivos' | 'acervo';

export const PANEL_TAB: Record<PanelId, TabId> = {
  entrada: 'inicio',
  jornada: 'inicio',
  resumo: 'inicio',
  documento: 'documento',
  terreno: 'terreno',
  pdfs: 'arquivos',
  json: 'arquivos',
  acervo: 'acervo',
};

let router: Router | null = null;
export function bindRouter(r: Router) {
  router = r;
}

/** Resolve quando o bloco para de se mexer na tela (fim da rolagem suave). */
function settled(el: HTMLElement, maxMs = 1600): Promise<void> {
  return new Promise((resolve) => {
    let last = Number.NaN;
    let calm = 0;
    let spent = 0;
    const tick = () => {
      const top = Math.round(el.getBoundingClientRect().top);
      calm = top === last ? calm + 1 : 0;
      last = top;
      spent += 60;
      if (calm >= 2 || spent >= maxMs) resolve();
      else setTimeout(tick, 60);
    };
    setTimeout(tick, 60);
  });
}

/** Rola até o bloco e, quando ele assenta, avisa o bloco (evento "arrive"):
 *  o Tile responde com a animação de chegada — o "é aqui" do menu. */
export function scrollToPanel(id: PanelId, arrive = true): void {
  const el = document.getElementById(`painel-${id}`);
  if (!el) return;
  const still = prefersReducedMotion() || document.documentElement.classList.contains('still');
  el.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
  if (arrive) void settled(el).then(() => el.dispatchEvent(new CustomEvent('arrive')));
}

export async function goTo(id: PanelId, isDesktop: boolean): Promise<void> {
  if (isDesktop) {
    scrollToPanel(id);
    return;
  }
  const tab = PANEL_TAB[id];
  if (router && router.currentRoute.value.path !== `/tabs/${tab}`) await router.push(`/tabs/${tab}`);
  setTimeout(() => scrollToPanel(id), 320);
}
