/* Fila de arquivos para juntar num PDF só — tudo no aparelho. Recusa na
   entrada o que não sabe processar, em vez de descartar em silêncio. */
import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import { download } from '@/core/browser';
import { isPdf, isSupported, mergeFiles, pdfInfo, rasterize, stripAnnotations } from '@/services/pdf/pdf-service';

export interface QueueItem {
  id: number;
  file: File;
  name: string;
  size: number;
  kind: 'pdf' | 'img';
  pages: number | null;
  thumb: string | null;
}

let seq = 0;

export const useQueueStore = defineStore('queue', () => {
  const items = ref<QueueItem[]>([]);
  const busy = ref(false);
  const progress = ref(0);
  const label = ref('');
  const thumbsUrls = shallowRef<string[]>([]);

  const totals = computed(() => {
    const bytes = items.value.reduce((s, i) => s + i.size, 0);
    const pages = items.value.reduce((s, i) => s + (i.pages ?? 0), 0);
    return { bytes, pages, unknown: items.value.some((i) => i.pages === null), count: items.value.length };
  });

  function add(list: Iterable<File>): { added: QueueItem[]; rejected: File[] } {
    const files = Array.from(list);
    const good = files.filter(isSupported);
    const rejected = files.filter((f) => !isSupported(f));
    const added = good.map<QueueItem>((f) => ({
      id: ++seq,
      file: f,
      name: f.name,
      size: f.size,
      kind: isPdf(f) ? 'pdf' : 'img',
      pages: isPdf(f) ? null : 1,
      thumb: null,
    }));
    items.value.push(...added);
    void enrich(added.map((a) => a.id));
    return { added, rejected };
  }

  /** miniatura e contagem de páginas, sem travar a interface */
  async function enrich(ids: number[]) {
    for (const id of ids) {
      const it = items.value.find((i) => i.id === id);
      if (!it) continue;
      try {
        if (it.kind === 'img') {
          const url = URL.createObjectURL(it.file);
          thumbsUrls.value = [...thumbsUrls.value, url];
          it.thumb = url;
        } else {
          const info = await pdfInfo(it.file);
          it.pages = info.pages;
          it.thumb = info.thumb;
        }
      } catch {
        /* miniatura é enfeite: falhar aqui não atrapalha */
      }
    }
  }

  function remove(id: number): () => void {
    const i = items.value.findIndex((q) => q.id === id);
    if (i < 0) return () => {};
    const [gone] = items.value.splice(i, 1);
    return () => items.value.splice(i, 0, gone!);
  }

  function move(id: number, dir: -1 | 1) {
    const i = items.value.findIndex((q) => q.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= items.value.length) return;
    const list = items.value;
    [list[i], list[j]] = [list[j]!, list[i]!];
  }

  function reorder(from: number, to: number) {
    if (from === to || from < 0 || to < 0) return;
    const [it] = items.value.splice(from, 1);
    items.value.splice(to, 0, it!);
  }

  function clear(): () => void {
    const backup = items.value.slice();
    items.value = [];
    return () => (items.value = backup);
  }

  function files(): File[] {
    return items.value.map((i) => i.file);
  }

  /** Gera e baixa o PDF; clean = cada página vira imagem (sem links). */
  async function generate(clean: boolean): Promise<string> {
    if (!items.value.length || busy.value) return '';
    busy.value = true;
    progress.value = 0;
    const on = (p: number, l: string) => {
      progress.value = p;
      label.value = l;
    };
    try {
      let bytes = await mergeFiles(files(), (p, l) => on(p * 0.4, l));
      if (clean) {
        const stripped = await stripAnnotations(bytes);
        bytes = await rasterize(stripped.bytes, {}, (p, l) => on(0.4 + p * 0.6, l));
      }
      const base = items.value.length === 1 ? items.value[0]!.name.replace(/\.[^.]+$/, '') : 'Matricula_consolidada';
      const name = `${base}${clean ? '_limpo' : ''}.pdf`;
      download(bytes as BlobPart, name, 'application/pdf');
      return name;
    } finally {
      busy.value = false;
      progress.value = 0;
      label.value = '';
    }
  }

  return { items, busy, progress, label, totals, add, remove, move, reorder, clear, files, generate };
});
