<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import CursorCompanion from '@/components/ink/CursorCompanion.vue';
import HelpModal from '@/components/dialogs/HelpModal.vue';
import PromptModal from '@/components/dialogs/PromptModal.vue';
import SettingsModal from '@/components/dialogs/SettingsModal.vue';
import TextModal from '@/components/dialogs/TextModal.vue';
import DragDock from '@/components/layout/DragDock.vue';
import IntroCurtain from '@/components/layout/IntroCurtain.vue';
</script>

<template>
  <ion-app>
    <ion-router-outlet />
    <SettingsModal />
    <HelpModal />
    <PromptModal />
    <TextModal />
    <DragDock />
    <CursorCompanion />
    <IntroCurtain />
  </ion-app>
</template>
