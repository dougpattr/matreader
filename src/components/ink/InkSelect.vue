<script setup lang="ts" generic="V extends string | number">
/* Seletor do app (no lugar do ion-select): o gatilho é um campo-pílula com
   a mesma altura dos botões; a lista abre num cartão de papel ancorado ao
   gatilho (acima dele se faltar espaço embaixo), com o item atual marcado.
   Padrão "combobox só de seleção" do WAI-ARIA: o foco fica no gatilho e a
   lista é percorrida por aria-activedescendant — por isso funciona dentro
   de modais do Ionic sem brigar com a armadilha de foco deles.
   Teclado: ↑/↓, Home/End, PgUp/PgDn, Enter/Espaço, Esc, Tab e digitar as
   primeiras letras. */
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';
import Icon from './Icon.vue';
import type { InkOption } from './ink-select';

const props = withDefaults(
  defineProps<{
    modelValue: V;
    options: InkOption<V>[];
    /** nome acessível quando não há <label for> apontando para o gatilho */
    label?: string;
    id?: string;
    size?: 'sm' | 'md';
  }>(),
  { label: undefined, id: undefined, size: 'md' },
);
const emit = defineEmits<{ 'update:modelValue': [value: V] }>();
// raiz dupla (gatilho + lista teleportada): classes e atributos vão para o gatilho
defineOptions({ inheritAttrs: false });

const uid = `ink-sel-${Math.random().toString(36).slice(2, 8)}`;
const open = ref(false);
const active = ref(-1);
const trigger = ref<HTMLButtonElement | null>(null);
const list = ref<HTMLElement | null>(null);
const pos = ref<{ left: number; width: number; top?: number; bottom?: number; maxH: number; up: boolean }>({ left: 0, width: 0, maxH: 320, up: false });

const selIndex = computed(() => props.options.findIndex((o) => o.value === props.modelValue));
const current = computed(() => props.options[selIndex.value]);
const optId = (i: number) => `${uid}-opt-${i}`;

function place() {
  const r = trigger.value?.getBoundingClientRect();
  if (!r) return;
  const below = innerHeight - r.bottom - 12;
  const above = r.top - 12;
  const want = Math.min(340, props.options.length * 54 + 14);
  const up = below < Math.min(want, 220) && above > below;
  const width = Math.max(r.width, 220);
  const left = Math.min(Math.max(8, r.left), innerWidth - width - 8);
  pos.value = up
    ? { left, width, bottom: innerHeight - r.top + 6, maxH: Math.min(340, above), up }
    : { left, width, top: r.bottom + 6, maxH: Math.min(340, below), up };
}

function scrollActive() {
  const el = list.value?.querySelector<HTMLElement>(`#${optId(active.value)}`);
  el?.scrollIntoView({ block: 'nearest' });
}

function show(at = selIndex.value) {
  if (open.value) return;
  place();
  open.value = true;
  active.value = at >= 0 ? at : 0;
  void nextTick(scrollActive);
  addEventListener('scroll', onScroll, true);
  addEventListener('resize', place);
  document.addEventListener('pointerdown', onOutside, true);
}
function hide(refocus = true) {
  if (!open.value) return;
  open.value = false;
  removeEventListener('scroll', onScroll, true);
  removeEventListener('resize', place);
  document.removeEventListener('pointerdown', onOutside, true);
  if (refocus) trigger.value?.focus();
}
function choose(i: number, refocus = true) {
  const o = props.options[i];
  if (o && o.value !== props.modelValue) emit('update:modelValue', o.value);
  hide(refocus);
}
function move(to: number) {
  active.value = Math.max(0, Math.min(props.options.length - 1, to));
  void nextTick(scrollActive);
}

function onOutside(e: PointerEvent) {
  const t = e.target as Node;
  if (trigger.value?.contains(t) || list.value?.contains(t)) return;
  hide(false);
}
function onScroll(e: Event) {
  if (list.value?.contains(e.target as Node)) return;
  place();
}

let typed = '';
let typedAt = 0;
const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
function typeahead(ch: string) {
  const now = Date.now();
  typed = now - typedAt > 700 ? ch : typed + ch;
  typedAt = now;
  const n = props.options.length;
  const from = (open.value ? active.value : selIndex.value) + (typed.length === 1 ? 1 : 0);
  for (let k = 0; k < n; k++) {
    const i = (from + k + n) % n;
    if (norm(props.options[i]!.label).startsWith(norm(typed))) {
      if (!open.value) show(i);
      else move(i);
      return;
    }
  }
}

function onKey(e: KeyboardEvent) {
  const last = props.options.length - 1;
  if (!open.value) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      show(e.key === 'ArrowUp' ? Math.max(0, selIndex.value - 1) : selIndex.value);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      show(e.key === 'Home' ? 0 : last);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      typeahead(e.key);
    }
    return;
  }
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      move(active.value + 1);
      break;
    case 'ArrowUp':
      e.preventDefault();
      if (e.altKey) choose(active.value);
      else move(active.value - 1);
      break;
    case 'Home':
      e.preventDefault();
      move(0);
      break;
    case 'End':
      e.preventDefault();
      move(last);
      break;
    case 'PageDown':
      e.preventDefault();
      move(active.value + 5);
      break;
    case 'PageUp':
      e.preventDefault();
      move(active.value - 5);
      break;
    case 'Enter':
    case ' ':
      e.preventDefault();
      choose(active.value);
      break;
    case 'Escape':
      // não deixa o Esc chegar ao modal do Ionic (fecharia a janela inteira)
      e.preventDefault();
      e.stopPropagation();
      hide();
      break;
    case 'Tab':
      choose(active.value, false);
      break;
    default:
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) typeahead(e.key);
  }
}

onBeforeUnmount(() => hide(false));
</script>

<template>
  <button
    v-bind="$attrs"
    :id="id"
    ref="trigger"
    type="button"
    class="ink-select"
    :class="[size, { open }]"
    role="combobox"
    aria-haspopup="listbox"
    :aria-expanded="open"
    :aria-controls="`${uid}-list`"
    :aria-activedescendant="open && active >= 0 ? optId(active) : undefined"
    :aria-label="label"
    @click="open ? hide() : show()"
    @keydown="onKey"
  >
    <span class="value">{{ current?.label ?? '—' }}</span>
    <span class="chev" aria-hidden="true"><Icon name="down" size="sm" /></span>
  </button>
  <Teleport to="body">
    <Transition name="ink-list">
      <ul
        v-if="open"
        :id="`${uid}-list`"
        ref="list"
        class="ink-listbox scroll"
        :class="{ up: pos.up }"
        role="listbox"
        :aria-label="label"
        :style="{ left: `${pos.left}px`, width: `${pos.width}px`, top: pos.top !== undefined ? `${pos.top}px` : undefined, bottom: pos.bottom !== undefined ? `${pos.bottom}px` : undefined, maxHeight: `${pos.maxH}px` }"
        @mousedown.prevent
      >
        <li
          v-for="(o, i) in options"
          :id="optId(i)"
          :key="String(o.value)"
          role="option"
          :aria-selected="o.value === modelValue"
          :class="{ active: i === active, selected: o.value === modelValue }"
          :style="{ '--k': i }"
          @pointermove="active = i"
          @click="choose(i)"
        >
          <span class="opt">
            <b>{{ o.label }}</b>
            <small v-if="o.hint">{{ o.hint }}</small>
          </span>
          <Icon v-if="o.value === modelValue" name="check" size="sm" />
        </li>
      </ul>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* gatilho: campo-pílula, mesma família dos campos e botões */
.ink-select {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
  min-height: var(--h-md);
  padding: 0 6px 0 18px;
  border-radius: var(--r-pill);
  border: var(--edge) solid var(--line-2);
  background: var(--paper-3);
  color: var(--ink);
  font: 500 14px/1.2 var(--f-ui);
  text-align: left;
  cursor: pointer;
  transition:
    border-color var(--d1) var(--ease),
    box-shadow var(--d2) var(--ease),
    background-color var(--d2) var(--ease);
  -webkit-tap-highlight-color: transparent;
}
.ink-select:hover {
  border-color: var(--ink-3);
}
.ink-select:focus-visible,
.ink-select.open {
  outline: none;
  border-color: var(--slate);
  background: var(--paper-2);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--slate) 18%, transparent);
}
.ink-select.sm {
  min-height: var(--h-sm);
  padding-left: 14px;
  font-size: 12.5px;
  font-weight: 600;
}
.value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chev {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex: none;
  border-radius: 50%;
  background: var(--paper-2);
  box-shadow: inset 0 0 0 1px var(--line-2);
  color: var(--ink-2);
  transition: transform var(--d3) var(--spring);
}
.sm .chev {
  width: 24px;
  height: 24px;
}
.open .chev {
  transform: rotate(180deg);
}

/* a lista: cartão de papel com contorno de nanquim */
.ink-listbox {
  position: fixed;
  z-index: 40000;
  margin: 0;
  padding: 6px;
  list-style: none;
  overflow: auto;
  border-radius: 18px;
  border: var(--edge) solid var(--ink-stroke);
  background: var(--paper-2) var(--grain);
  box-shadow: var(--shadow-pop);
  transform-origin: 50% 0;
}
.ink-listbox.up {
  transform-origin: 50% 100%;
}
.ink-listbox li {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 8px 12px 8px 14px;
  border-radius: 12px;
  color: var(--ink-2);
  cursor: pointer;
  animation: opt-in var(--d3) var(--ease) backwards;
  animation-delay: calc(var(--k) * 28ms);
}
.ink-listbox li.active {
  background: var(--paper-3);
  color: var(--ink);
}
.ink-listbox li.selected {
  color: var(--ink);
}
.ink-listbox li.selected .opt b {
  font-weight: 700;
}
.ink-listbox li .ink-icon {
  color: var(--slate-2);
}
.opt {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 2px;
}
.opt b {
  font: 500 13.5px/1.3 var(--f-ui);
}
.opt small {
  font-size: 11.5px;
  line-height: 1.35;
  color: var(--ink-3);
}
@keyframes opt-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
}
.ink-list-enter-active {
  transition:
    opacity var(--d2) var(--ease),
    transform var(--d3) var(--spring);
}
.ink-list-leave-active {
  transition:
    opacity var(--d1) var(--ease),
    transform var(--d1) var(--ease);
}
.ink-list-enter-from,
.ink-list-leave-to {
  opacity: 0;
  transform: scale(0.96, 0.9) translateY(-4px);
}
.ink-listbox.up.ink-list-enter-from,
.ink-listbox.up.ink-list-leave-to {
  transform: scale(0.96, 0.9) translateY(4px);
}
</style>
