<script setup lang="ts">
/* Documento: a matrícula montada, com navegação por seção, busca dentro
   do texto (CPF, nome, ato), cópia de códigos, impressão e JSON. */
import { computed, nextTick, ref, watch } from 'vue';
import { useAppActions } from '@/app/actions';
import EmptyState from '@/components/ink/EmptyState.vue';
import Icon from '@/components/ink/Icon.vue';
import Tile from '@/components/ink/Tile.vue';
import { copyText } from '@/core/browser';
import { toast } from '@/composables/useToast';
import { renderDocument } from '@/features/document/render-document';
import { useMatriculaStore } from '@/stores/matricula';
import { useUiStore } from '@/stores/ui';

const mat = useMatriculaStore();
const ui = useUiStore();
const actions = useAppActions();
const article = ref<HTMLElement | null>(null);
const searchOpen = ref(false);
const term = ref('');
const hits = ref(0);
const hitIndex = ref(0);
const allSegs = ref(false);

const rendered = computed(() =>
  mat.data ? renderDocument(mat.data, { demo: mat.isDemo, summary: mat.summary, checks: mat.checks }) : null,
);
const sub = computed(() => (mat.data ? mat.label : 'matrícula montada'));

function onClick(e: MouseEvent) {
  const t = e.target as HTMLElement;
  const copy = t.closest<HTMLElement>('[data-copy]');
  if (copy) {
    void copyText(copy.dataset.copy ?? '').then((ok) =>
      toast(ok ? 'Código copiado.' : 'Não consegui copiar — selecione e use Ctrl+C.', { type: ok ? 'ok' : 'erro', ms: 2400 }),
    );
    return;
  }
  if (t.closest('[data-seg-all]')) allSegs.value = true;
}

function goSection(id: string) {
  article.value?.querySelector(`#sec-${id}`)?.scrollIntoView({ behavior: ui.still ? 'auto' : 'smooth', block: 'start' });
}

/* ---------- busca no documento ---------- */
function clearMarks() {
  article.value?.querySelectorAll('mark.doc-hit').forEach((m) => m.replaceWith(document.createTextNode(m.textContent ?? '')));
  article.value?.normalize();
}

function highlight() {
  clearMarks();
  hits.value = 0;
  hitIndex.value = 0;
  const q = term.value.trim();
  if (!article.value || q.length < 2) return;
  const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const needle = norm(q);
  const walker = document.createTreeWalker(article.value, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest('button, script, style') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) {
    const text = node.data;
    const hay = norm(text);
    let from = 0;
    let idx = hay.indexOf(needle, from);
    if (idx < 0) continue;
    const frag = document.createDocumentFragment();
    while (idx >= 0) {
      frag.append(text.slice(from, idx));
      const mark = document.createElement('mark');
      mark.className = 'doc-hit';
      mark.textContent = text.slice(idx, idx + needle.length);
      frag.append(mark);
      hits.value++;
      from = idx + needle.length;
      idx = hay.indexOf(needle, from);
    }
    frag.append(text.slice(from));
    node.replaceWith(frag);
  }
  if (hits.value) focusHit(0);
}

function focusHit(i: number) {
  const marks = article.value?.querySelectorAll<HTMLElement>('mark.doc-hit');
  if (!marks?.length) return;
  hitIndex.value = (i + marks.length) % marks.length;
  marks.forEach((m, k) => m.classList.toggle('current', k === hitIndex.value));
  marks[hitIndex.value]!.scrollIntoView({ behavior: ui.still ? 'auto' : 'smooth', block: 'center' });
}

let t: ReturnType<typeof setTimeout> | undefined;
watch(term, () => {
  clearTimeout(t);
  t = setTimeout(highlight, 220);
});
watch(rendered, async () => {
  allSegs.value = false;
  await nextTick();
  if (term.value.trim().length >= 2) highlight();
});
function toggleSearch() {
  searchOpen.value = !searchOpen.value;
  if (!searchOpen.value) {
    term.value = '';
    clearMarks();
  } else void nextTick(() => document.getElementById('doc-search')?.focus());
}
</script>

<template>
  <Tile id="documento" :index="5" title="Documento" :sub="sub" picto="scroll" accent="rose" expandable style="--i: 4">
    <template #tools>
      <button type="button" class="ink-round sm ghost" :class="{ on: searchOpen }" :aria-pressed="searchOpen" aria-label="Buscar no documento" title="Buscar no documento" :disabled="!mat.data" @click="toggleSearch">
        <Icon name="search" size="sm" />
      </button>
      <button type="button" class="ink-round sm ghost" aria-label="Imprimir" title="Imprimir ou salvar em PDF" :disabled="!mat.data" @click="actions.print()">
        <Icon name="print" size="sm" />
      </button>
      <button type="button" class="ink-round sm ghost" aria-label="Baixar o JSON" title="Baixar o JSON desta matrícula" :disabled="!mat.data" @click="actions.downloadJson()">
        <Icon name="download" size="sm" />
      </button>
    </template>

    <EmptyState v-if="!rendered" picto="scroll" title="O documento aparece aqui" text="Converta um PDF na Entrada, cole o JSON da IA ou abra o exemplo.">
      <button type="button" class="btn btn--sm" @click="actions.loadDemo()">Abrir o exemplo</button>
    </EmptyState>

    <template v-else>
      <div class="doc-tools">
        <nav class="doc-nav" aria-label="Seções do documento">
          <button v-for="s in rendered.sections" :key="s.id" type="button" @click="goSection(s.id)">{{ s.label }}</button>
        </nav>
        <div v-if="searchOpen" class="doc-search" role="search">
          <Icon name="search" size="sm" />
          <input id="doc-search" v-model="term" class="grow" type="search" placeholder="Nome, CPF, ato, confrontante…" aria-label="Buscar no documento" @keydown.enter.prevent="focusHit(hitIndex + 1)" />
          <span class="mono count" aria-live="polite">{{ term.trim().length < 2 ? '' : hits ? `${hitIndex + 1}/${hits}` : '0' }}</span>
          <button type="button" class="ink-round sm ghost" aria-label="Resultado anterior" :disabled="!hits" @click="focusHit(hitIndex - 1)"><Icon name="up" size="sm" /></button>
          <button type="button" class="ink-round sm ghost" aria-label="Próximo resultado" :disabled="!hits" @click="focusHit(hitIndex + 1)"><Icon name="down" size="sm" /></button>
        </div>
      </div>
      <article ref="article" class="doc" :class="{ 'all-segs': allSegs }" @click="onClick" v-html="rendered.html" />
    </template>
  </Tile>
</template>

<style scoped>
.doc-tools {
  position: sticky;
  top: 0;
  z-index: 5;
  display: grid;
  gap: var(--s2);
  padding: var(--s1) 0 var(--s2);
  background: var(--paper-2);
}
.doc-nav {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
}
.doc-nav::-webkit-scrollbar {
  display: none;
}
.doc-nav button {
  flex: none;
  min-height: 30px;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid var(--line-2);
  background: var(--paper-3);
  font: 700 10.5px/1.3 var(--f-ui);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-3);
  cursor: pointer;
}
@media (pointer: coarse) {
  .doc-nav button {
    min-height: 40px;
    padding: 6px 14px;
  }
}
.doc-nav button:hover {
  color: var(--ink);
  border-color: var(--ink-3);
}
.doc-search {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 4px 2px 12px;
  border-radius: 999px;
  background: var(--paper-3);
  box-shadow: inset 0 0 0 1px var(--line-2);
  color: var(--ink-3);
}
.doc-search input {
  border: 0;
  background: transparent;
  outline: none;
  min-height: 34px;
  font-size: 13px;
  color: var(--ink);
}
.count {
  font-size: 12px;
  min-width: 36px;
  text-align: right;
}
</style>
