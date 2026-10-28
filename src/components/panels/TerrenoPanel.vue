<script setup lang="ts">
/* Terreno: o polígono sobre o satélite ou como desenho técnico — com
   ajuste fino, exportação (KML, KMZ, Google Maps, croqui) e tela cheia. */
import { IonLabel, IonSegment, IonSegmentButton } from '@ionic/vue';
import { computed, defineAsyncComponent } from 'vue';
import { useAppActions } from '@/app/actions';
import EmptyState from '@/components/ink/EmptyState.vue';
import Icon from '@/components/ink/Icon.vue';
import Tile from '@/components/ink/Tile.vue';
import FitControls from '@/components/terrain/FitControls.vue';
import GeoCanvas from '@/components/terrain/GeoCanvas.vue';
import { fmt, fmtInt } from '@/core/format';
import { useMatriculaStore } from '@/stores/matricula';
import { useTerrainStore } from '@/stores/terrain';
import { useUiStore } from '@/stores/ui';

const GeoMap = defineAsyncComponent(() => import('@/components/terrain/GeoMap.vue'));

const mat = useMatriculaStore();
const terrain = useTerrainStore();
const ui = useUiStore();
const actions = useAppActions();

const g = computed(() => mat.summary);
const sat = computed(() => terrain.mode === 'sat' && ui.online);
const sub = computed(() =>
  !mat.data ? 'polígono sobre satélite' : !g.value ? 'sem geometria nesta matrícula' : `${fmtInt(g.value.vertices)} vértices · ${g.value.located ? 'georreferenciado' : 'falta posicionar'}`,
);
const shifted = computed(() => {
  if (!mat.fit.dLat && !mat.fit.dLng) return 0;
  const lat0 = mat.points?.[0]?.y ?? 0;
  return Math.hypot((mat.fit.dLat || 0) * 111320, (mat.fit.dLng || 0) * 111320 * Math.cos((lat0 * Math.PI) / 180));
});
</script>

<template>
  <Tile id="terreno" :index="4" title="Terreno" :sub="sub" picto="mountain" accent="sage" expandable style="--i: 3">
    <template #tools>
      <ion-segment :value="terrain.mode" class="mode-seg" aria-label="Modo do terreno" @ion-change="terrain.setMode($event.detail.value as 'sat' | 'draw')">
        <ion-segment-button value="sat"><ion-label>Satélite</ion-label></ion-segment-button>
        <ion-segment-button value="draw"><ion-label>Desenho</ion-label></ion-segment-button>
      </ion-segment>
      <button type="button" class="ink-round sm ghost" :class="{ on: terrain.fitOpen }" :aria-pressed="terrain.fitOpen" aria-label="Ajuste fino" title="Ajuste fino: giro, espelho, opacidade e amarração" :disabled="!mat.hasGeo" @click="terrain.fitOpen = !terrain.fitOpen">
        <Icon name="target" size="sm" />
      </button>
      <button type="button" class="ink-round sm ghost" aria-label="Exportar" title="Exportar KML, KMZ, Google Maps ou croqui" :disabled="!mat.hasGeo" @click="actions.openExportSheet()">
        <Icon name="download" size="sm" />
      </button>
    </template>

    <div class="stage">
      <template v-if="mat.hasGeo">
        <GeoMap v-if="sat" />
        <GeoCanvas v-else />
        <p v-if="!ui.online && terrain.mode === 'sat'" class="offline-note"><Icon name="offline" size="sm" />Sem internet: mostrando o desenho técnico.</p>
      </template>
      <EmptyState
        v-else
        class="stage-empty"
        picto="compass"
        :title="mat.data ? 'Sem geometria nesta matrícula' : 'O terreno aparece aqui'"
        text="Assim que o documento trouxer azimutes e distâncias — ou coordenadas — o polígono é desenhado sobre o satélite."
      />
      <Transition name="hint">
        <p v-if="terrain.hint" class="map-hint" :class="terrain.hintTone">{{ terrain.hint }}</p>
      </Transition>
      <Transition name="fit">
        <div v-if="terrain.fitOpen && mat.hasGeo" class="fit-slot"><FitControls /></div>
      </Transition>
    </div>

    <div v-if="g" class="geo-facts">
      <span><b class="num">{{ fmt(g.area) }}</b> m² · <b class="num">{{ fmt(g.area / 10000, 4) }}</b> ha</span>
      <span>perímetro <b class="num">{{ fmt(g.perimeter) }}</b> m</span>
      <span><b class="num">{{ fmtInt(g.vertices) }}</b> vértices</span>
      <span v-if="g.gap !== null" :class="{ bad: !g.closes }">fechamento <b class="num">{{ fmt(g.gap, 2) }}</b> m</span>
      <span v-if="g.selfIntersections" class="bad">contorno cruzado</span>
      <span v-if="mat.geo.usedUtm" class="chip chip--info">UTM convertida</span>
      <span v-if="mat.fit.rot">giro <b class="num">{{ fmt(mat.fit.rot, 1) }}°</b></span>
      <span v-if="shifted">deslocado <b class="num">{{ fmt(shifted, 1) }}</b> m</span>
      <span class="chip chip--mute" :title="ui.kernel === 'wasm' ? 'Contas feitas pelo núcleo em WebAssembly' : 'Contas feitas em TypeScript'">
        <Icon name="wasm" size="sm" />{{ ui.kernel === 'wasm' ? 'WebAssembly' : 'TypeScript' }}
      </span>
    </div>
  </Tile>
</template>

<style scoped>
.mode-seg {
  width: 196px;
}
.stage {
  position: relative;
  flex: 1 1 auto;
  height: clamp(340px, 52vh, 640px);
  min-height: 300px;
  border-radius: var(--r-md);
  overflow: hidden;
  background: var(--paper-3);
  box-shadow: inset 0 0 0 1px var(--line-2);
}
:global(.tile.is-focus) .stage {
  height: auto;
}
.stage-empty {
  position: absolute;
  inset: 0;
  align-content: center;
}
.offline-note {
  position: absolute;
  left: 50%;
  bottom: 12px;
  translate: -50% 0;
  z-index: 600;
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--paper-2);
  box-shadow: 0 0 0 1.2px var(--ink-stroke);
  font-size: 12px;
  color: var(--ink-2);
}
.map-hint {
  position: absolute;
  top: 58px;
  left: 50%;
  translate: -50% 0;
  z-index: 650;
  max-width: min(92%, 440px);
  padding: 8px 16px;
  border-radius: 999px;
  background: var(--ink);
  color: var(--paper-2);
  font-size: 12.5px;
  line-height: 1.4;
  text-align: center;
  pointer-events: none;
}
.map-hint.wheel {
  top: auto;
  bottom: 44px;
}
.fit-slot {
  position: absolute;
  left: 10px;
  bottom: 10px;
  right: 10px;
  z-index: 700;
  display: flex;
  justify-content: flex-start;
  pointer-events: none;
}
.fit-slot > * {
  pointer-events: auto;
}
.geo-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  align-items: center;
  font-size: 12.5px;
  color: var(--ink-2);
}
.geo-facts b {
  color: var(--ink);
  font-weight: 600;
}
.geo-facts .bad {
  color: var(--bad);
}
.hint-enter-active,
.hint-leave-active,
.fit-enter-active,
.fit-leave-active {
  transition:
    opacity var(--d2) var(--ease),
    transform var(--d2) var(--ease);
}
.hint-enter-from,
.hint-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
.fit-enter-from,
.fit-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
@media (max-width: 991px) {
  .stage {
    height: clamp(320px, 58vh, 560px);
  }
  .mode-seg {
    width: 200px;
  }
}
</style>
