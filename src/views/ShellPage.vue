<script setup lang="ts">
/* Casca do app. Desktop (≥ 992 px): painel bento com tudo visível.
   Celular e tablet em pé: abas Ionic, cada uma com seus blocos. */
import { IonContent, IonPage, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs, IonLabel, IonBadge } from '@ionic/vue';
import AppHeader from '@/components/layout/AppHeader.vue';
import DesktopWorkspace from '@/components/layout/DesktopWorkspace.vue';
import InkFrame from '@/components/ink/InkFrame.vue';
import Picto from '@/components/ink/Picto.vue';
import { useFlowStore } from '@/stores/flow';
import { useMatriculaStore } from '@/stores/matricula';
import { useQueueStore } from '@/stores/queue';
import { useUiStore } from '@/stores/ui';

const ui = useUiStore();
const mat = useMatriculaStore();
const queue = useQueueStore();
const flow = useFlowStore();

const TABS = [
  { tab: 'inicio', label: 'Início', picto: 'feather' },
  { tab: 'documento', label: 'Documento', picto: 'scroll' },
  { tab: 'terreno', label: 'Terreno', picto: 'mountain' },
  { tab: 'arquivos', label: 'Arquivos', picto: 'pages' },
  { tab: 'acervo', label: 'Acervo', picto: 'chest' },
] as const;
</script>

<template>
  <ion-page>
    <template v-if="ui.isDesktop">
      <AppHeader />
      <ion-content id="desk-content" :scroll-events="false">
        <DesktopWorkspace />
      </ion-content>
    </template>
    <ion-tabs v-else>
      <ion-router-outlet />
      <div class="tab-fade" aria-hidden="true" />
      <ion-tab-bar id="app-tab-bar" slot="bottom" class="live-frame">
        <InkFrame seed="abas" :radius="24" :jitter="0.9" :draw="!ui.still" live />
        <ion-tab-button v-for="t in TABS" :key="t.tab" :tab="t.tab" :href="`/tabs/${t.tab}`">
          <Picto class="tab-ink" :name="t.picto" :size="26" />
          <ion-label>{{ t.label }}</ion-label>
          <ion-badge v-if="t.tab === 'inicio' && flow.busy">…</ion-badge>
          <ion-badge v-else-if="t.tab === 'documento' && mat.data && mat.stats.bad">{{ mat.stats.bad }}</ion-badge>
          <ion-badge v-else-if="t.tab === 'arquivos' && queue.items.length">{{ queue.items.length }}</ion-badge>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<style scoped>
/* véu de papel sob a barra de abas: o conteúdo esmaece ao passar por baixo */
.tab-fade {
  position: absolute;
  inset: auto 0 0;
  z-index: 5;
  height: calc(var(--float-bottom) + 8px);
  background: linear-gradient(to top, var(--paper) 35%, color-mix(in srgb, var(--paper) 70%, transparent) 70%, transparent);
  pointer-events: none;
}
</style>
