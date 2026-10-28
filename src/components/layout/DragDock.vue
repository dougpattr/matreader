<script setup lang="ts">
/* Doca de destinos que sobe durante o arraste (desktop): o usuário sempre
   escolhe para onde os arquivos vão — nada sai do aparelho sem ele
   apontar "Converter com IA". */
import { useAppActions } from '@/app/actions';
import Icon from '@/components/ink/Icon.vue';
import { useDropZone } from '@/composables/useDropZone';
import { useUiStore } from '@/stores/ui';

const ui = useUiStore();
const actions = useAppActions();
const ia = useDropZone((files) => void actions.handleDrop(files, 'ia'));
const pdf = useDropZone((files) => void actions.handleDrop(files, 'pdf'));
</script>

<template>
  <Transition name="dock">
    <div v-if="ui.dragging && ui.isDesktop" class="dock" aria-hidden="true">
      <div class="target" :class="{ over: ia.over.value }" v-bind="ia.bind">
        <Icon name="bolt" size="lg" />
        <span><b>Converter com IA</b><small>o texto vai ao seu fluxo e volta como documento</small></span>
      </div>
      <div class="target sage" :class="{ over: pdf.over.value }" v-bind="pdf.bind">
        <Icon name="pages" size="lg" />
        <span><b>Juntar na fila de PDF</b><small>fica no aparelho, nada é enviado</small></span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.dock {
  position: fixed;
  left: 50%;
  bottom: 26px;
  z-index: 8000;
  display: flex;
  gap: var(--s4);
  translate: -50% 0;
}
.target {
  display: flex;
  align-items: center;
  gap: var(--s3);
  max-width: 300px;
  padding: var(--s4) var(--s5) calc(var(--s4) + 4px);
  border: 2px dashed var(--ink-stroke);
  border-radius: var(--r-plaque);
  background: var(--paper-2) var(--grain);
  box-shadow: var(--shadow-pop);
  color: var(--rose-ink);
  cursor: copy;
  transition:
    transform var(--d2) var(--spring),
    background-color var(--d2) var(--ease);
}
.target.sage {
  color: var(--teal);
}
.target b {
  display: block;
  font-size: 14px;
  color: var(--ink);
}
.target small {
  display: block;
  font-size: 11.5px;
  color: var(--ink-3);
  line-height: 1.35;
}
.target.over {
  border-style: solid;
  background-color: var(--rose-soft);
  transform: translateY(-6px) scale(1.04);
}
.target.sage.over {
  background-color: var(--teal-soft);
}
.dock-enter-active,
.dock-leave-active {
  transition:
    opacity var(--d2) var(--ease),
    transform var(--d3) var(--spring);
}
.dock-enter-from,
.dock-leave-to {
  opacity: 0;
  transform: translateY(24px);
}
</style>
