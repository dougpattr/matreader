<script setup lang="ts">
/* Cabeçalho: marca, atalhos para os blocos (desktop) e ações globais em
   botões redondos de tinta — os mesmos do botão de som do Nomadic Tribe. */
import { IonHeader, IonToolbar } from '@ionic/vue';
import { computed } from 'vue';
import { useAppActions } from '@/app/actions';
import Icon from '@/components/ink/Icon.vue';
import { useLibraryStore } from '@/stores/library';
import { useMatriculaStore } from '@/stores/matricula';
import { useModalsStore } from '@/stores/modals';
import { PANELS, useUiStore } from '@/stores/ui';

defineProps<{ title?: string }>();
const ui = useUiStore();
const mat = useMatriculaStore();
const lib = useLibraryStore();
const modals = useModalsStore();
const actions = useAppActions();
const saveChip = computed(() => (lib.saveStatus.text ? lib.saveStatus : null));
</script>

<template>
  <ion-header class="app-header">
    <ion-toolbar>
      <div class="bar">
        <a class="brand" href="#/tabs/inicio" aria-label="MatReader — início">
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32"><path d="M6 25V8.6c3.4 2.2 6.6 4.6 10 6.9 3.4-2.3 6.6-4.7 10-6.9V25" /><path class="dot" d="M16 26.4c-.1-3.6.1-7.1 0-10.6" /></svg>
          </span>
          <span class="brand-text">
            <b>MatReader</b>
            <small v-if="ui.isDesktop">matrículas · terreno · acervo</small>
            <small v-else-if="title">{{ title }}</small>
          </span>
        </a>

        <nav v-if="ui.isDesktop" class="jump" aria-label="Ir para um bloco">
          <button v-for="p in PANELS" :key="p.id" type="button" :class="{ on: ui.activePanel === p.id }" :title="`${p.label} (${p.key})`" @click="actions.goTo(p.id)">
            {{ p.label }}
          </button>
        </nav>

        <div class="actions">
          <span v-if="!ui.online" class="chip chip--mute" title="Sem internet: mapa de satélite e conversão por IA indisponíveis"><Icon name="offline" size="sm" />offline</span>
          <span v-if="ui.isDesktop && saveChip" class="chip" :class="`chip--${saveChip.kind || 'mute'}`">{{ saveChip.text }}</span>
          <template v-if="ui.isDesktop">
            <button type="button" class="ink-round sm" aria-label="Nova matrícula" title="Fechar esta matrícula e começar outra" :disabled="!mat.data" @click="actions.newMatricula()"><Icon name="new" size="sm" /></button>
            <button type="button" class="ink-round sm" aria-label="Imprimir" title="Imprimir ou salvar em PDF (Ctrl+P)" :disabled="!mat.data" @click="actions.print()"><Icon name="print" size="sm" /></button>
          </template>
          <button type="button" class="ink-round sm" :aria-label="ui.dark ? 'Tema papel' : 'Tema noite'" :title="ui.dark ? 'Voltar ao tema papel' : 'Tema noite'" @click="ui.toggleTheme()"><Icon :name="ui.dark ? 'sun' : 'moon'" size="sm" /></button>
          <button type="button" class="ink-round sm" aria-label="Configurações" title="Configurações" @click="modals.settings = true"><Icon name="gear" size="sm" /></button>
          <button type="button" class="ink-round sm" aria-label="Ajuda" title="Como usar (tecla ?)" @click="modals.help = true"><Icon name="help" size="sm" /></button>
        </div>
      </div>
    </ion-toolbar>
  </ion-header>
</template>

<style scoped>
.bar {
  display: flex;
  align-items: center;
  gap: var(--s4);
  min-height: var(--header-h);
  padding: 0 var(--s1);
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--ink);
  flex: none;
}
@media (pointer: coarse) {
  .brand {
    min-height: 44px;
  }
}
.brand-mark {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 50% 50% 8px 8px;
  background: var(--slate);
  box-shadow:
    0 0 0 2px var(--ink-stroke),
    inset 0 0 0 3px var(--paper-2);
}
.brand-mark svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: var(--on-slate);
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.brand-mark .dot {
  stroke: var(--rose);
}
.brand-text b {
  display: block;
  font: 800 16px/1.1 var(--f-display);
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--slate-2);
}
.brand-text small {
  display: block;
  font: 600 10.5px/1.3 var(--f-ui);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.jump {
  display: flex;
  gap: 4px;
  margin: 0 auto;
  overflow-x: auto;
  scrollbar-width: none;
}
.jump button {
  position: relative;
  flex: none;
  min-height: 34px;
  padding: 8px 12px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  font: 700 11px/1 var(--f-ui);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
  cursor: pointer;
}
.jump button:hover {
  color: var(--ink);
  background: var(--paper-3);
}
.jump button.on {
  color: var(--slate-2);
}
.jump button.on::after {
  content: '';
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 1px;
  height: 5px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 5' preserveAspectRatio='none'%3E%3Cpath d='M1 3.2C9 1.6 17 3.8 25 2.4S36 1.8 39 2.8' fill='none' stroke='%235f6787' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") center/100% 100% no-repeat;
}
.actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  flex: none;
}
@media (max-width: 1240px) {
  .jump button {
    padding: 8px 8px;
    letter-spacing: 0.08em;
  }
}
@media (max-width: 991px) {
  .bar {
    gap: var(--s2);
  }
  .brand-mark {
    width: 34px;
    height: 34px;
  }
  .brand-text b {
    font-size: 14px;
  }
}
</style>
