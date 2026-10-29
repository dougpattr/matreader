<script setup lang="ts">
/* Entrada: a paisagem ocupa o bloco inteiro (o lote demarcado é o "alvo"
   onde a matrícula chega) e uma folha de papel por baixo guarda as ações —
   PDF, fotos (câmera no celular), JSON colado ou o exemplo. */
import { computed, ref, watch } from 'vue';
import { useAppActions } from '@/app/actions';
import Icon from '@/components/ink/Icon.vue';
import LandscapeScene from '@/components/ink/LandscapeScene.vue';
import Tile from '@/components/ink/Tile.vue';
import { useDropZone } from '@/composables/useDropZone';
import { useFlowStore } from '@/stores/flow';
import { useModalsStore } from '@/stores/modals';
import { useUiStore } from '@/stores/ui';

const actions = useAppActions();
const flow = useFlowStore();
const ui = useUiStore();
const modals = useModalsStore();
const { over, bind } = useDropZone((files) => void actions.convert(files));

const flash = ref<'done' | 'error' | null>(null);
watch(
  () => flow.outcome,
  (o) => {
    flash.value = o === 'ok' ? 'done' : o === 'erro' ? 'error' : null;
    if (o) setTimeout(() => (flash.value = null), o === 'ok' ? 3200 : 6000);
  },
);

const state = computed(() => (flow.busy ? 'busy' : over.value || ui.dragging ? 'over' : (flash.value ?? 'idle')));
const title = computed(() =>
  flow.busy ? flow.label : state.value === 'over' ? 'Solte aqui para converter' : state.value === 'done' ? 'Matrícula recebida' : 'Solte a matrícula aqui',
);
const canCapture = navigator.maxTouchPoints > 0 || /Android|iPhone|iPad/i.test(navigator.userAgent);

function openPrompt() {
  modals.promptKind = 'completo';
  modals.prompt = true;
}
</script>

<template>
  <Tile id="entrada" :index="1" title="Entrada" sub="arraste, fotografe, cole ou abra" picto="feather" accent="rose" hero style="--i: 0">
    <div class="stage" :class="`is-${state}`" v-bind="bind" data-cursor="Solte para converter" data-cursor-icon="arrow-down">
      <LandscapeScene :state="state">
        <div class="sign-wrap">
          <p class="cartel" :class="{ busy: flow.busy }" aria-live="polite">
            <Icon :name="flow.busy ? 'clock' : state === 'done' ? 'check' : 'arrow-down'" size="sm" :class="{ spin: flow.busy }" />
            <span>{{ title }}</span>
          </p>
        </div>
      </LandscapeScene>
    </div>

    <div class="sheet">
      <svg class="sheet-edge" viewBox="0 0 400 16" preserveAspectRatio="none" aria-hidden="true">
        <path class="edge-fill" d="M0 9C40 3 76 12 118 8s78-6 120-1 84 7 120 2c18-2 32-1 42 1v8H0z" />
        <path class="edge-line" d="M0 9C40 3 76 12 118 8s78-6 120-1 84 7 120 2c18-2 32-1 42 1" />
      </svg>

      <div class="cta">
        <button type="button" class="btn btn--primary btn--lg btn--block" :disabled="flow.busy" @click="actions.pickAndConvert()">
          <Icon name="bolt" class="idle" />Converter com IA<Icon name="arrow-right" class="go" />
        </button>
        <small>PDF ou fotos — vários arquivos viram um documento só</small>
      </div>

      <div class="entry-actions">
        <button v-if="canCapture && !ui.isDesktop" type="button" class="btn btn--sm" @click="actions.photograph()">
          <Icon name="camera" size="sm" />Fotografar
        </button>
        <button type="button" class="btn btn--sm" @click="actions.pasteJson()"><Icon name="braces" size="sm" />Colar JSON</button>
        <button type="button" class="btn btn--sm" @click="actions.openJsonFile()"><Icon name="file" size="sm" />Abrir .json</button>
        <button type="button" class="btn btn--sm" @click="actions.loadDemo()"><Icon name="sparkle" size="sm" />Exemplo</button>
        <button type="button" class="btn btn--sm" @click="actions.copyPrompt('completo')"><Icon name="copy" size="sm" />Copiar prompt</button>
        <button type="button" class="btn btn--sm" @click="openPrompt"><Icon name="eye" size="sm" />Ver prompt</button>
      </div>

      <p class="privacy">
        <Icon name="shield" size="sm" />
        <span><b>Fica no aparelho:</b> documento, acervo, OCR e junção de PDFs. <b>Sai daqui:</b> o texto da matrícula vai ao seu fluxo do Power Automate, e o mapa busca imagens e endereços.</span>
      </p>
    </div>
  </Tile>
</template>

<style scoped>
/* o palco: a paisagem de ponta a ponta, cantos de cima no raio do bloco */
.stage {
  position: relative;
  flex: 1 1 auto;
  min-height: clamp(330px, 31vw, 420px);
  border-radius: var(--tile-r) var(--tile-r) 0 0;
  overflow: hidden;
  outline: 2px dashed transparent;
  outline-offset: -12px;
  transition: outline-color var(--d2) var(--ease);
}
.stage.is-over {
  outline-color: var(--rose-ink);
}

/* cartel de papel pendurado no céu (o "↑ Drag" do Nomadic Tribe) */
.sign-wrap {
  position: absolute;
  inset: clamp(76px, 27%, 128px) 16px auto;
  display: flex;
  justify-content: center;
  pointer-events: none;
}
.cartel {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  max-width: 100%;
  padding: 10px 20px 10px 16px;
  border-radius: 6px;
  background: var(--paper-2) var(--grain);
  box-shadow:
    0 0 0 1.6px var(--ink-stroke),
    4px 4px 0 0 rgba(30, 28, 36, 0.16);
  font: 700 11.5px/1.3 var(--f-ui);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink);
  transform-origin: 50% -20px;
  animation: sign-swing 6s var(--ease-in-out) infinite;
}
.cartel .ink-icon {
  flex: none;
  color: var(--rose-ink);
}
.cartel .i-arrow-down {
  animation: nudge 1.6s var(--ease-in-out) infinite;
}
.cartel span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.is-over .cartel {
  animation: sign-hop 0.7s var(--spring) infinite alternate;
  box-shadow:
    0 0 0 2px var(--rose-ink),
    4px 4px 0 0 rgba(151, 74, 64, 0.25);
}
@keyframes sign-swing {
  0%,
  100% {
    transform: rotate(-2.2deg);
  }
  50% {
    transform: rotate(-0.4deg);
  }
}
@keyframes sign-hop {
  to {
    transform: translateY(-5px) rotate(-1deg) scale(1.03);
  }
}
@keyframes nudge {
  50% {
    transform: translateY(3px);
  }
}

/* a folha de papel por cima do pé da paisagem, com a borda rasgada à mão */
.sheet {
  position: relative;
  z-index: 3;
  display: grid;
  gap: var(--s4);
  margin-top: -14px;
  padding: 16px var(--tile-pad) calc(var(--tile-pad) + 2px);
  border-radius: 0 0 var(--tile-r) var(--tile-r);
  background: var(--paper-2) var(--grain);
}
.sheet-edge {
  position: absolute;
  left: 0;
  right: 0;
  top: -13px;
  width: 100%;
  height: 16px;
  overflow: visible;
}
.edge-fill {
  fill: var(--paper-2);
}
.edge-line {
  fill: none;
  stroke: var(--ink-stroke);
  stroke-width: 1.4;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
}
.cta {
  display: grid;
  justify-items: center;
  gap: 8px;
}
.cta small {
  font-size: 12px;
  color: var(--ink-3);
  text-align: center;
}
.entry-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s2);
}
.entry-actions > .btn {
  flex: 1 1 148px;
}
.privacy {
  display: flex;
  gap: var(--s2);
  align-items: flex-start;
  padding-top: var(--s3);
  border-top: 1px dashed var(--line-2);
  font-size: 12px;
  line-height: 1.5;
  color: var(--ink-3);
}
.privacy .ink-icon {
  margin-top: 2px;
  color: var(--teal);
}
.privacy b {
  color: var(--ink-2);
}

@media (max-width: 991px) {
  .stage {
    flex: none;
    min-height: 0;
    aspect-ratio: 4 / 3.2;
  }
}
@media (max-width: 420px) {
  .stage {
    aspect-ratio: 4 / 3.6;
  }
  .cta .btn--lg {
    font-size: 14px;
  }
}
</style>
