/* MatReader — ponto de entrada. Ordem: estilos → núcleo WebAssembly →
   estado → app → serviços que dependem do app montado. */
import { IonicVue } from '@ionic/vue';
import { createPinia } from 'pinia';
import { createApp } from 'vue';

import '@ionic/vue/css/core.css';
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';

import '@fontsource/montserrat/latin-400.css';
import '@fontsource/montserrat/latin-500.css';
import '@fontsource/montserrat/latin-600.css';
import '@fontsource/montserrat/latin-700.css';
import '@fontsource/unbounded/latin-700.css';
import '@fontsource/unbounded/latin-800.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';

import './styles/tokens.css';
import './styles/ionic-theme.css';
import './styles/base.css';
import './styles/document.css';
import './styles/print.css';

import App from './App.vue';
import { useAppActions } from './app/actions';
import { bindRouter } from './app/navigation';
import { installPrintHooks } from './app/print';
import { installLaunchQueue, installShortcuts, installWindowDrop } from './app/shortcuts';
import { inkSpriteMarkup } from './assets/ink-sprite';
import { toast } from './composables/useToast';
import { router } from './router';
import { registerPwa } from './services/pwa';
import { useLibraryStore } from './stores/library';
import { useMatriculaStore } from './stores/matricula';
import { useSettingsStore } from './stores/settings';
import { useUiStore } from './stores/ui';
import { loadGeometryWasm } from './wasm/geometry-wasm';

async function boot() {
  document.body.insertAdjacentHTML('afterbegin', inkSpriteMarkup());

  // o núcleo geométrico (~6 KB) entra antes da primeira conta
  const kernel = await loadGeometryWasm();

  const app = createApp(App).use(IonicVue, { mode: 'md' }).use(createPinia()).use(router);
  bindRouter(router);

  const ui = useUiStore();
  ui.kernel = kernel ? 'wasm' : 'ts';
  const settings = useSettingsStore();
  settings.$subscribe(() => settings.persist());

  const mat = useMatriculaStore();
  const lib = useLibraryStore();
  const restored = mat.restoreSession();
  void lib.refresh();

  await router.isReady();
  app.mount('#app');

  // gancho de depuração (só em desenvolvimento): testes ponta a ponta no console
  if (import.meta.env.DEV) Object.assign(window, { __matreader: { actions: useAppActions(), mat, lib, settings } });

  installPrintHooks();
  installShortcuts();
  installWindowDrop();
  installLaunchQueue();

  void registerPwa({
    onNeedRefresh: (update) =>
      void toast('Há uma versão nova do MatReader.', { action: 'Atualizar', persist: true, onAction: () => void update() }),
    onOfflineReady: () => void toast('Pronto: o MatReader agora abre mesmo sem internet.', { type: 'ok' }),
  });

  if (!restored) {
    const actions = useAppActions();
    setTimeout(() => {
      void toast('Comece soltando o PDF da matrícula na Entrada — ou veja o exemplo funcionando.', {
        ms: 9000,
        action: 'Ver exemplo',
        onAction: () => actions.loadDemo(),
      });
    }, 1800);
  }
}

void boot();
