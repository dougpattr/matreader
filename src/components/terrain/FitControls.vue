<script setup lang="ts">
/* Ajuste fino do polígono: giro exato, espelhos, medidas, opacidade e o
   ponto de amarração do vértice inicial. Nada disso altera a matrícula. */
import { ref, watch } from 'vue';
import Icon from '@/components/ink/Icon.vue';
import { copyText } from '@/core/browser';
import { toast } from '@/composables/useToast';
import { useMatriculaStore } from '@/stores/matricula';
import { useTerrainStore } from '@/stores/terrain';

const mat = useMatriculaStore();
const terrain = useTerrainStore();
const anchor = ref(mat.fit.anchor);
watch(() => mat.fit.anchor, (a) => (anchor.value = a));

function step(e: MouseEvent | KeyboardEvent) {
  return e.shiftKey ? 0.1 : e.ctrlKey || e.metaKey ? 15 : 1;
}
function rotBy(dir: number, e: MouseEvent) {
  mat.setRotation(mat.fit.rot + dir * step(e));
}
function onRange(e: Event) {
  mat.setRotation(parseFloat((e.target as HTMLInputElement).value));
}
function onNum(e: Event) {
  const v = parseFloat((e.target as HTMLInputElement).value);
  if (Number.isFinite(v)) mat.setRotation(v);
}
function onRangeKey(e: KeyboardEvent) {
  const dir = ({ ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 } as Record<string, number>)[e.key];
  if (!dir) return;
  e.preventDefault();
  mat.setRotation(mat.fit.rot + dir * step(e));
}
function commitAnchor() {
  if (anchor.value !== mat.fit.anchor) mat.setAnchor(anchor.value.trim());
}
async function copyAnchor() {
  const ok = await copyText(mat.fit.anchor || '');
  void toast(ok ? 'Coordenada copiada.' : 'Não consegui copiar.', { type: ok ? 'ok' : 'erro', ms: 2200 });
}
function reset() {
  const undo = mat.resetFit();
  void toast('Ajustes desfeitos.', { action: 'Desfazer', onAction: undo });
}
</script>

<template>
  <div class="fit" role="group" aria-label="Ajuste fino do polígono">
    <div class="fit-row">
      <span class="label">Rotação</span>
      <button type="button" class="ink-round sm" title="Girar à esquerda (Shift 0,1° · Ctrl 15°)" aria-label="Girar à esquerda" @click="rotBy(-1, $event)"><Icon name="rot-ccw" size="sm" /></button>
      <input class="rot-range" type="range" min="-180" max="180" step="0.1" :value="mat.fit.rot" aria-label="Ângulo de rotação" @input="onRange" @keydown="onRangeKey" />
      <button type="button" class="ink-round sm" title="Girar à direita (Shift 0,1° · Ctrl 15°)" aria-label="Girar à direita" @click="rotBy(1, $event)"><Icon name="rot-cw" size="sm" /></button>
      <input class="input rot-num mono" type="number" min="-180" max="180" step="0.1" :value="mat.fit.rot" aria-label="Ângulo exato em graus" @change="onNum" />
    </div>
    <div class="fit-row">
      <span class="label">Espelhar</span>
      <button type="button" class="plaque plaque--sm" :class="{ 'plaque--primary': mat.fit.flipX }" :aria-pressed="mat.fit.flipX" @click="mat.patchFit({ flipX: !mat.fit.flipX })">Eixo X</button>
      <button type="button" class="plaque plaque--sm" :class="{ 'plaque--primary': mat.fit.flipY }" :aria-pressed="mat.fit.flipY" @click="mat.patchFit({ flipY: !mat.fit.flipY })">Eixo Y</button>
      <button type="button" class="plaque plaque--sm" :class="{ 'plaque--primary': terrain.measures }" :aria-pressed="terrain.measures" title="Azimute e distância em cada lado (modo Desenho)" @click="terrain.measures = !terrain.measures">Medidas</button>
    </div>
    <div class="fit-row">
      <span class="label">Opacidade</span>
      <input v-model.number="terrain.opacity" class="slim" type="range" min="0" max="0.8" step="0.02" aria-label="Opacidade do preenchimento" />
      <span class="mono num pct">{{ Math.round(terrain.opacity * 100) }}%</span>
    </div>
    <div class="field">
      <label for="anchor-input">Amarração do vértice inicial (lat, long)</label>
      <div class="row nowrap">
        <input id="anchor-input" v-model="anchor" class="input mono" placeholder="-22.858000, -47.193000" @change="commitAnchor" @keydown.enter="commitAnchor" />
        <button type="button" class="ink-round sm" aria-label="Copiar coordenada" title="Copiar coordenada" @click="copyAnchor"><Icon name="copy" size="sm" /></button>
      </div>
      <small>Usada quando a matrícula só traz azimutes e distâncias. Tocar no mapa também preenche.</small>
    </div>
    <div class="fit-row end">
      <button type="button" class="plaque plaque--sm plaque--ghost" @click="reset"><Icon name="refresh" size="sm" />Desfazer ajustes</button>
    </div>
  </div>
</template>

<style scoped>
.fit {
  display: grid;
  gap: var(--s3);
  padding: var(--s3) var(--s4);
  width: min(360px, 100%);
  border-radius: 14px;
  background: color-mix(in srgb, var(--paper-2) 95%, transparent);
  box-shadow: 0 0 0 1.4px var(--ink-stroke), var(--shadow-pop);
}
.fit-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.fit-row .label {
  width: 72px;
  flex: none;
}
.fit-row.end {
  justify-content: flex-end;
}
.rot-range,
.slim {
  flex: 1;
  min-width: 80px;
  accent-color: var(--slate);
}
.rot-num {
  width: 76px;
  min-height: 34px;
  text-align: right;
  padding: 4px 8px;
}
.pct {
  width: 40px;
  text-align: right;
  font-size: 12px;
}
.nowrap {
  flex-wrap: nowrap;
}
</style>
