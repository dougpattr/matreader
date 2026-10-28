/* Atalhos de teclado (desktop): 1–8 pulam entre os blocos, ? ajuda,
   Ctrl+S salva, Ctrl+P imprime, Ctrl+O converte, Esc sai da tela cheia. */
import { useModalsStore } from '@/stores/modals';
import { PANELS, useUiStore } from '@/stores/ui';
import { useAppActions } from './actions';

export function installShortcuts(): void {
  const ui = useUiStore();
  const modals = useModalsStore();
  const actions = useAppActions();

  document.addEventListener('keydown', (e) => {
    const el = e.target as HTMLElement | null;
    const typing = !!el && (/^(input|textarea|select)$/i.test(el.tagName) || el.isContentEditable || !!el.closest('ion-searchbar, ion-input'));
    const mod = e.ctrlKey || e.metaKey;
    if (e.key === 'Escape' && ui.focusPanel) {
      ui.focusPanel = null;
      return;
    }
    if (mod && !e.shiftKey && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === 's') {
        e.preventDefault();
        void actions.saveNow();
      } else if (k === 'p') {
        e.preventDefault();
        actions.print();
      } else if (k === 'o') {
        e.preventDefault();
        void actions.pickAndConvert();
      }
      return;
    }
    if (typing || e.altKey || mod) return;
    if (e.key === '?') {
      e.preventDefault();
      modals.help = true;
      return;
    }
    const p = PANELS.find((x) => x.key === e.key);
    if (p) {
      e.preventDefault();
      void actions.goTo(p.id);
    }
  });
}

/* PWA instalada: abrir PDF/JSON direto pelo sistema (File Handling API). */
export function installLaunchQueue(): void {
  const actions = useAppActions();
  window.launchQueue?.setConsumer(async (params) => {
    if (!params.files?.length) return;
    const files = await Promise.all(params.files.map((h) => h.getFile()));
    void actions.handleDrop(files);
  });
}

/* Arraste de arquivos sobre a janela: acende a doca de destinos. */
export function installWindowDrop(): void {
  const ui = useUiStore();
  const actions = useAppActions();
  let depth = 0;
  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');
  addEventListener('dragenter', (e) => {
    if (!hasFiles(e)) return;
    depth++;
    ui.dragging = true;
  });
  addEventListener('dragover', (e) => {
    if (hasFiles(e)) e.preventDefault();
  });
  addEventListener('dragleave', () => {
    depth = Math.max(0, depth - 1);
    if (!depth) ui.dragging = false;
  });
  addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth = 0;
    ui.dragging = false;
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length) void actions.handleDrop(files);
  });
}
