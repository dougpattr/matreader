/* Área que aceita arquivos soltos, com estado "por cima" para o visual. */
import { ref, type Ref } from 'vue';
import { useUiStore } from '@/stores/ui';

export function useDropZone(onFiles: (files: File[]) => void) {
  const over: Ref<boolean> = ref(false);
  const ui = useUiStore();
  let depth = 0;
  const has = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');
  return {
    over,
    bind: {
      onDragenter(e: DragEvent) {
        if (!has(e)) return;
        e.preventDefault();
        e.stopPropagation();
        depth++;
        over.value = true;
      },
      onDragover(e: DragEvent) {
        if (!has(e)) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        over.value = true;
      },
      onDragleave(e: DragEvent) {
        if (!has(e)) return;
        depth = Math.max(0, depth - 1);
        if (!depth) over.value = false;
      },
      onDrop(e: DragEvent) {
        if (!has(e)) return;
        e.preventDefault();
        e.stopPropagation();
        depth = 0;
        over.value = false;
        ui.dragging = false;
        const files = Array.from(e.dataTransfer?.files ?? []);
        if (files.length) onFiles(files);
      },
    },
  };
}
