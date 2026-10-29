<script setup lang="ts">
/* Folha (modal) padrão do app: cabeçalho com marca, título e subtítulo,
   conteúdo com respiro generoso e rodapé opcional para as ações. Todas as
   janelas (Configurações, Ajuda, Prompt, Texto) usam esta mesma casca —
   mesmos recuos, mesma tipografia, mesmo botão de fechar. */
import { IonContent, IonFooter, IonHeader, IonModal } from '@ionic/vue';
import Icon from './Icon.vue';
import Picto from './Picto.vue';

withDefaults(defineProps<{ open: boolean; title: string; sub?: string; picto?: string; icon?: string; narrow?: boolean }>(), {
  sub: '',
  picto: '',
  icon: '',
  narrow: false,
});
const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <ion-modal class="ink-modal" :class="{ narrow }" :is-open="open" @did-dismiss="emit('close')">
    <ion-header class="sheet-head">
      <div class="head">
        <span v-if="picto || icon" class="mark">
          <Picto v-if="picto" :name="picto" :size="28" />
          <Icon v-else :name="icon" />
        </span>
        <div class="titles">
          <h2>{{ title }}</h2>
          <p v-if="sub">{{ sub }}</p>
        </div>
        <button type="button" class="ink-round" aria-label="Fechar" title="Fechar (Esc)" @click="emit('close')"><Icon name="x" /></button>
      </div>
    </ion-header>
    <ion-content class="sheet-content">
      <div class="body">
        <slot />
      </div>
    </ion-content>
    <ion-footer v-if="$slots.foot" class="sheet-foot">
      <div class="foot">
        <slot name="foot" />
      </div>
    </ion-footer>
  </ion-modal>
</template>

<style scoped>
.sheet-head,
.sheet-foot {
  box-shadow: none;
}
.head {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: calc(var(--ion-safe-area-top, 0px) + 24px) 24px 20px 28px;
  border-bottom: 1px solid var(--line);
  background: var(--paper-2) var(--grain);
}
.mark {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  flex: none;
  border-radius: 50%;
  background: var(--slate-soft);
  color: var(--slate-2);
}
.titles {
  flex: 1;
  min-width: 0;
}
h2 {
  margin: 0;
  font: 700 19px/1.2 var(--f-display);
  letter-spacing: 0.01em;
  color: var(--ink);
}
.titles p {
  margin-top: 4px;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--ink-3);
}
.body {
  display: grid;
  gap: 20px;
  padding: 24px 28px 36px;
}
.foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: var(--s2);
  padding: 14px 28px calc(14px + var(--safe-bottom));
  border-top: 1px solid var(--line);
  background: var(--paper-2);
}
@media (max-width: 600px) {
  .head {
    gap: 12px;
    padding: calc(var(--ion-safe-area-top, 0px) + 16px) 16px 14px 20px;
  }
  .mark {
    width: 42px;
    height: 42px;
  }
  h2 {
    font-size: 17px;
  }
  .body {
    gap: 16px;
    padding: 18px 18px 28px;
  }
  .foot {
    padding: 12px 18px calc(12px + var(--safe-bottom));
  }
}
</style>
