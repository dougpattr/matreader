/* Avisos (Ionic toast) no estilo do app, com ação de desfazer. No celular
   ficam acima da barra de abas. */
import { toastController } from '@ionic/vue';
import { closeOutline } from 'ionicons/icons';
import { useUiStore } from '@/stores/ui';

export interface ToastOptions {
  type?: 'info' | 'ok' | 'erro';
  ms?: number;
  action?: string;
  onAction?: () => void | Promise<void>;
  persist?: boolean;
}

export async function toast(message: string, o: ToastOptions = {}): Promise<HTMLIonToastElement> {
  const ui = useUiStore();
  const t = await toastController.create({
    message,
    duration: o.persist ? 0 : (o.ms ?? (o.type === 'erro' ? 7000 : 4200)),
    cssClass: ['ink-toast', o.type && o.type !== 'info' ? `ink-toast--${o.type}` : ''].filter(Boolean),
    position: 'bottom',
    positionAnchor: ui.isDesktop ? undefined : 'app-tab-bar',
    swipeGesture: 'vertical',
    buttons: [
      ...(o.action ? [{ text: o.action, handler: () => void o.onAction?.() }] : []),
      { icon: closeOutline, role: 'cancel', side: 'end' as const, htmlAttributes: { 'aria-label': 'Fechar aviso' } },
    ],
  });
  await t.present();
  return t;
}
