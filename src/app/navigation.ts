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

export function scrollToPanel(id: PanelId, pulse = true): void {
  const el = document.getElementById(`painel-${id}`);
  if (!el) return;
  el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  if (pulse && !prefersReducedMotion()) {
    el.animate(
      [{ boxShadow: '0 0 0 0 rgba(95,103,135,.55)' }, { boxShadow: '0 0 0 12px rgba(95,103,135,0)' }],
      { duration: 800, easing: 'cubic-bezier(.215,.61,.355,1)' },
    );
  }
}

export async function goTo(id: PanelId, isDesktop: boolean): Promise<void> {
  if (isDesktop) {
    scrollToPanel(id);
    return;
  }
  const tab = PANEL_TAB[id];
  if (router && router.currentRoute.value.path !== `/tabs/${tab}`) await router.push(`/tabs/${tab}`);
  setTimeout(() => scrollToPanel(id, false), 320);
}
