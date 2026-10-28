/* Janelas (Ionic modal) abertas a partir de qualquer lugar do app. */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { PromptKind } from '@/domain/prompts';

export type TextPayload = { title: string; subtitle: string; text: string; filename: string };

export const useModalsStore = defineStore('modals', () => {
  const settings = ref(false);
  const help = ref(false);
  const prompt = ref(false);
  const promptKind = ref<PromptKind>('completo');
  const text = ref<TextPayload | null>(null);

  function openText(p: TextPayload) {
    text.value = p;
  }

  return { settings, help, prompt, promptKind, text, openText };
});
