<script setup lang="ts">
/* Satélite (Leaflet, carregado sob demanda). Arraste o polígono para
   mover, o pegador para girar; toque no mapa para posicionar o vértice
   inicial quando a matrícula só traz azimutes. A roda do mouse rola a
   página — com Ctrl (ou em tela cheia) dá zoom. Sem marca do Leaflet:
   fica só o crédito exigido das imagens. */
import 'leaflet/dist/leaflet.css';
import type * as Leaflet from 'leaflet';
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import Icon from '@/components/ink/Icon.vue';
import { toast } from '@/composables/useToast';
import { formatAnchor, parseAnchor } from '@/domain/geo/angles';
import { searchPlaces, type Place } from '@/services/geo/geocoder';
import { useMatriculaStore } from '@/stores/matricula';
import { useTerrainStore } from '@/stores/terrain';
import { useUiStore } from '@/stores/ui';

const mat = useMatriculaStore();
const terrain = useTerrainStore();
const ui = useUiStore();

const el = ref<HTMLElement | null>(null);
const ready = ref(false);
const failed = ref('');
const query = ref('');
const results = ref<Place[] | null>(null);
const searching = ref(false);
const layersOpen = ref(false);
const base = ref<'hd' | 'sat' | 'ruas'>('hd');
const labelsOn = ref(false);

let L: typeof Leaflet;
const map = shallowRef<Leaflet.Map | null>(null);
let poly: Leaflet.Polygon | null = null;
let marks: Leaflet.CircleMarker[] = [];
let rotHandle: Leaflet.CircleMarker | null = null;
let rotGuide: Leaflet.Polyline | null = null;
let baseLayers: Record<'hd' | 'sat' | 'ruas', Leaflet.Layer>;
let labelLayer: Leaflet.Layer;
let lastKey = '';
let ro: ResizeObserver | null = null;

const MAX_ZOOM = 22;
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
const ESRI_IMG = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_HD = 'https://clarity.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const LABELS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

const css = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const accent = () => css('--rose-ink') || '#974a40';
const coarse = () => matchMedia('(pointer: coarse)').matches;

function tile(url: string, native: number, attribution = '') {
  return L.tileLayer(url, { maxNativeZoom: native, maxZoom: MAX_ZOOM, errorTileUrl: BLANK, attribution, crossOrigin: 'anonymous' });
}

async function init() {
  try {
    L = (await import('leaflet')).default;
  } catch {
    failed.value = 'Não consegui carregar o mapa.';
    terrain.setMode('draw');
    return;
  }
  if (!el.value) return;
  const m = L.map(el.value, { zoomControl: false, attributionControl: true, maxZoom: MAX_ZOOM, scrollWheelZoom: false });
  m.attributionControl.setPrefix('');
  baseLayers = {
    hd: L.layerGroup([tile(ESRI_IMG, 17, 'Imagens Esri'), tile(ESRI_HD, 20)]),
    sat: L.layerGroup([tile(ESRI_IMG, 19, 'Imagens Esri')]),
    ruas: tile(OSM, 19, '© OpenStreetMap'),
  };
  labelLayer = tile(LABELS, 19);
  baseLayers.hd.addTo(m);
  L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(m);
  m.setView([-15.78, -47.93], 4);

  m.getContainer().addEventListener(
    'wheel',
    (e: WheelEvent) => {
      if (e.ctrlKey || ui.focusPanel === 'terreno' || !ui.isDesktop) {
        e.preventDefault();
        e.stopPropagation();
        const p = m.mouseEventToContainerPoint(e as unknown as MouseEvent);
        m.setZoomAround(m.containerPointToLatLng(p), m.getZoom() + (e.deltaY < 0 ? 0.6 : -0.6));
      } else {
        e.stopPropagation();
        terrain.showHint('Use Ctrl + roda do mouse para dar zoom — ou abra em tela cheia', 2600, 'wheel');
      }
    },
    { capture: true, passive: false },
  );

  m.on('click', (e: Leaflet.LeafletMouseEvent) => {
    if (mat.geo.kind !== 'rel' || parseAnchor(mat.fit.anchor)) return;
    mat.setAnchor(formatAnchor({ lat: e.latlng.lat, lon: e.latlng.lng }));
    void toast('Polígono posicionado. Arraste para ajustar e use o pegador para girar.', { type: 'ok' });
  });

  map.value = m;
  ready.value = true;
  ro = new ResizeObserver(() => m.invalidateSize());
  ro.observe(el.value);
  draw(true);
}

function clearLayers() {
  const m = map.value;
  if (!m) return;
  marks.forEach((k) => m.removeLayer(k));
  marks = [];
  for (const l of [poly, rotHandle, rotGuide]) if (l) m.removeLayer(l);
  poly = null;
  rotHandle = null;
  rotGuide = null;
}

function draw(fitView: boolean) {
  const m = map.value;
  if (!m) return;
  const lls = mat.latLngs;
  if (!lls) {
    clearLayers();
    if (mat.geo.kind === 'rel') {
      terrain.showHint('Busque o endereço e toque no mapa para posicionar o vértice inicial', 0);
      void centerOnComarca();
    } else if (mat.geo.kind === 'none' && mat.data) terrain.showHint('Esta matrícula não trouxe azimutes nem coordenadas', 0);
    return;
  }
  terrain.hideHint();
  if (poly && poly.getLatLngs()[0] && (poly.getLatLngs()[0] as Leaflet.LatLng[]).length === lls.length) {
    poly.setLatLngs(lls);
    marks.forEach((k, i) => k.setLatLng(lls[i]!));
    moveRotHandle();
    poly.setStyle({ fillOpacity: terrain.opacity });
    return;
  }
  const isNew = !poly;
  clearLayers();
  poly = L.polygon(lls, { color: accent(), weight: 3, fillColor: accent(), fillOpacity: terrain.opacity, className: 'mat-poly' }).addTo(m);
  if (isNew && !ui.still) {
    const path = poly.getElement() as SVGPathElement | undefined;
    if (path) {
      path.classList.add('poly-draw');
      setTimeout(() => path.classList.remove('poly-draw'), 1400);
    }
  }
  attachPolyDrag();
  const many = lls.length > 120;
  const closed = mat.geo.kind === 'rel' && lls.length > 2 && m.distance(L.latLng(lls[0]!), L.latLng(lls[lls.length - 1]!)) < 1;
  lls.forEach((ll, i) => {
    if ((closed && i === lls.length - 1) || (many && i > 0)) return;
    const first = i === 0;
    const mk = L.circleMarker(ll, { radius: first ? 7 : 4, color: '#fff', weight: 1.5, fillColor: first ? accent() : '#3f7470', fillOpacity: 1 })
      .bindTooltip(`${mat.geo.labels[i] ?? `P${i + 1}`} · ${ll[0].toFixed(6)}, ${ll[1].toFixed(6)}`)
      .addTo(m);
    marks.push(mk);
  });
  addRotHandle();
  if (fitView) m.fitBounds(poly.getBounds().pad(0.45));
}

function handlePos() {
  const b = poly!.getBounds();
  const c = b.getCenter();
  const span = Math.max(b.getNorth() - b.getSouth(), 1e-5);
  return { center: c, pos: L.latLng(b.getNorth() + span * 0.18, c.lng) };
}

function addRotHandle() {
  const m = map.value;
  if (!poly || !m) return;
  const { center, pos } = handlePos();
  rotGuide = L.polyline([center, pos], { color: accent(), weight: 1.5, dashArray: '4,4', interactive: false }).addTo(m);
  rotHandle = L.circleMarker(pos, { radius: 9, color: '#fff', weight: 2, fillColor: accent(), fillOpacity: 1, className: 'rot-handle' })
    .addTo(m)
    .bindTooltip('Arraste para girar', { direction: 'top' });
  const h = rotHandle.getElement() as SVGElement | undefined;
  if (!h) return;
  h.setAttribute('data-cursor', 'Arraste para girar');
  h.addEventListener('pointerdown', (ev: PointerEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    h.setPointerCapture(ev.pointerId);
    m.dragging.disable();
    const c0 = poly!.getBounds().getCenter();
    const bearing = (ll: Leaflet.LatLng) => (Math.atan2((ll.lng - c0.lng) * Math.cos((c0.lat * Math.PI) / 180), ll.lat - c0.lat) * 180) / Math.PI;
    const start = bearing(m.mouseEventToLatLng(ev));
    const rot0 = mat.fit.rot;
    const move = (e2: PointerEvent) => mat.setRotation(rot0 + (bearing(m.mouseEventToLatLng(e2)) - start));
    const end = () => {
      h.removeEventListener('pointermove', move);
      h.removeEventListener('pointerup', end);
      h.removeEventListener('pointercancel', end);
      m.dragging.enable();
    };
    h.addEventListener('pointermove', move);
    h.addEventListener('pointerup', end);
    h.addEventListener('pointercancel', end);
  });
}

function moveRotHandle() {
  if (!poly || !rotHandle || !rotGuide) return;
  const { center, pos } = handlePos();
  rotHandle.setLatLng(pos);
  rotGuide.setLatLngs([center, pos]);
}

/** Arrastar o polígono vira AJUSTE, não reescrita: as coordenadas
 *  originais continuam no documento. */
function attachPolyDrag() {
  const m = map.value;
  const path = poly?.getElement() as SVGPathElement | undefined;
  if (!m || !path) return;
  path.setAttribute('data-cursor', 'Arraste para mover');
  path.addEventListener('pointerdown', (ev: PointerEvent) => {
    if (ev.button !== 0) return;
    ev.preventDefault();
    ev.stopPropagation();
    path.setPointerCapture(ev.pointerId);
    m.dragging.disable();
    const start = m.mouseEventToLatLng(ev);
    const ring0 = (poly!.getLatLngs()[0] as Leaflet.LatLng[]).map((ll) => [ll.lat, ll.lng] as [number, number]);
    let dLat = 0;
    let dLng = 0;
    const move = (e2: PointerEvent) => {
      const now = m.mouseEventToLatLng(e2);
      dLat = now.lat - start.lat;
      dLng = now.lng - start.lng;
      const moved = ring0.map(([a, b]) => [a + dLat, b + dLng] as [number, number]);
      poly!.setLatLngs(moved);
      marks.forEach((k, i) => k.setLatLng(moved[i]!));
      moveRotHandle();
    };
    const end = () => {
      path.removeEventListener('pointermove', move);
      path.removeEventListener('pointerup', end);
      path.removeEventListener('pointercancel', end);
      m.dragging.enable();
      if (Math.abs(dLat) < 1e-9 && Math.abs(dLng) < 1e-9) return;
      if (mat.geo.kind === 'abs') {
        mat.patchFit({ dLat: (mat.fit.dLat || 0) + dLat, dLng: (mat.fit.dLng || 0) + dLng });
        void toast('Deslocamento guardado como ajuste — as coordenadas originais ficam intactas.', { type: 'ok', ms: 3600 });
      } else {
        const a = parseAnchor(mat.fit.anchor);
        if (a) mat.setAnchor(formatAnchor({ lat: a.lat + dLat, lon: a.lon + dLng }));
      }
    };
    path.addEventListener('pointermove', move);
    path.addEventListener('pointerup', end);
    path.addEventListener('pointercancel', end);
  });
}

async function centerOnComarca() {
  const m = map.value;
  const mm = mat.data?.matricula;
  if (!m || !mm?.comarca) return;
  try {
    const [p] = await searchPlaces([mm.comarca, mm.uf, 'Brasil'].filter(Boolean).join(', '), 1);
    if (p && !parseAnchor(mat.fit.anchor)) {
      m.setView([p.lat, p.lon], 13);
      terrain.showHint(`Centralizado em ${mm.comarca}. Toque no mapa para posicionar o vértice inicial.`, 0);
    }
  } catch {}
}

async function search() {
  const q = query.value.trim();
  if (!q) return;
  searching.value = true;
  results.value = null;
  try {
    results.value = await searchPlaces(q, 5);
  } catch {
    results.value = [];
    void toast('A busca falhou (sem internet?).', { type: 'erro' });
  } finally {
    searching.value = false;
  }
}

function choose(p: Place) {
  map.value?.setView([p.lat, p.lon], 16);
  results.value = null;
  if (mat.geo.kind === 'rel' && !parseAnchor(mat.fit.anchor)) terrain.showHint('Toque no mapa para posicionar o vértice inicial', 0);
}

function setBase(b: 'hd' | 'sat' | 'ruas') {
  const m = map.value;
  if (!m) return;
  Object.values(baseLayers).forEach((l) => m.removeLayer(l));
  baseLayers[b].addTo(m);
  base.value = b;
  if (labelsOn.value) (labelLayer as Leaflet.TileLayer).bringToFront();
  poly?.bringToFront();
}

function toggleLabels() {
  const m = map.value;
  if (!m) return;
  labelsOn.value = !labelsOn.value;
  if (labelsOn.value) labelLayer.addTo(m);
  else m.removeLayer(labelLayer);
  poly?.bringToFront();
}

watch(
  () => [mat.revision, mat.loadedAt] as const,
  () => {
    const key = `${mat.id}|${mat.loadedAt}|${mat.geo.kind}`;
    const fresh = key !== lastKey;
    lastKey = key;
    draw(fresh);
  },
);
watch(() => terrain.opacity, (o) => poly?.setStyle({ fillOpacity: o }));
watch(() => ui.focusPanel, () => setTimeout(() => map.value?.invalidateSize(), 340));
watch(() => ui.dark, () => draw(false));

onMounted(() => {
  lastKey = `${mat.id}|${mat.loadedAt}|${mat.geo.kind}`;
  void init();
});
onBeforeUnmount(() => {
  ro?.disconnect();
  map.value?.remove();
  map.value = null;
});

defineExpose({ invalidate: () => map.value?.invalidateSize() });
</script>

<template>
  <div class="geo-map">
    <div ref="el" class="leaflet-host" :class="{ coarse: coarse() }" />
    <p v-if="failed" class="map-failed">{{ failed }}</p>

    <div v-if="ready" class="map-ui tl">
      <form class="map-search" role="search" @submit.prevent="search">
        <Icon name="search" size="sm" />
        <input v-model="query" class="map-input" type="search" placeholder="Buscar endereço, cidade ou fazenda" aria-label="Buscar endereço no mapa" />
        <button type="submit" class="btn btn--sm btn--primary" :disabled="searching">{{ searching ? '…' : 'Buscar' }}</button>
      </form>
      <div v-if="results" class="map-results" role="listbox" aria-label="Resultados da busca">
        <p v-if="!results.length" class="muted">Nada encontrado.</p>
        <button v-for="(p, i) in results" :key="i" type="button" role="option" @click="choose(p)">{{ p.label }}</button>
      </div>
    </div>

    <div v-if="ready" class="map-ui tr">
      <button type="button" class="ink-round sm" aria-label="Aproximar" title="Aproximar" @click="map?.zoomIn()"><Icon name="plus" size="sm" /></button>
      <button type="button" class="ink-round sm" aria-label="Afastar" title="Afastar" @click="map?.zoomOut()"><Icon name="minus" size="sm" /></button>
      <button type="button" class="ink-round sm" :aria-expanded="layersOpen" aria-label="Camadas do mapa" title="Camadas" @click="layersOpen = !layersOpen">
        <Icon name="layers" size="sm" />
      </button>
      <div v-if="layersOpen" class="layers-menu">
        <button v-for="b in (['hd', 'sat', 'ruas'] as const)" :key="b" type="button" class="btn btn--sm" :class="{ 'is-on': base === b }" :aria-pressed="base === b" @click="setBase(b)">
          {{ b === 'hd' ? 'Satélite HD' : b === 'sat' ? 'Satélite' : 'Ruas' }}
        </button>
        <button type="button" class="btn btn--sm" :class="{ 'is-on': labelsOn }" :aria-pressed="labelsOn" @click="toggleLabels">Nomes e limites</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.geo-map {
  position: absolute;
  inset: 0;
}
.leaflet-host {
  position: absolute;
  inset: 0;
  background: var(--paper-3);
}
.map-failed {
  position: absolute;
  inset: auto 0 40% 0;
  text-align: center;
  color: var(--ink-3);
}
.map-ui {
  position: absolute;
  z-index: 500;
  display: flex;
  gap: 6px;
  pointer-events: none;
}
.map-ui > * {
  pointer-events: auto;
}
.map-ui.tl {
  top: 10px;
  left: 10px;
  right: 64px;
  flex-direction: column;
  align-items: flex-start;
}
.map-ui.tr {
  top: 10px;
  right: 10px;
  flex-direction: column;
  align-items: flex-end;
}
.map-search {
  display: flex;
  align-items: center;
  gap: 6px;
  width: min(340px, 100%);
  padding: 4px 4px 4px 12px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--paper-2) 92%, transparent);
  box-shadow: 0 0 0 1.4px var(--ink-stroke), var(--shadow-lift);
  color: var(--ink-3);
}
.map-input {
  flex: 1;
  min-width: 0;
  min-height: 30px;
  border: 0;
  background: transparent;
  font: 400 13px var(--f-ui);
  color: var(--ink);
  outline: none;
}
@media (pointer: coarse) {
  .map-input {
    min-height: 40px;
  }
}
.map-results {
  display: grid;
  gap: 2px;
  width: min(340px, 100%);
  max-height: 220px;
  overflow: auto;
  padding: 6px;
  border-radius: 12px;
  background: var(--paper-2);
  box-shadow: 0 0 0 1.4px var(--ink-stroke), var(--shadow-lift);
}
.map-results button {
  text-align: left;
  padding: 8px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  font-size: 12.5px;
  color: var(--ink-2);
  cursor: pointer;
}
.map-results button:hover {
  background: var(--paper-3);
}
.map-results p {
  padding: 8px;
  font-size: 12.5px;
}
.layers-menu {
  display: grid;
  gap: 6px;
  padding: 8px;
  border-radius: 12px;
  background: var(--paper-2);
  box-shadow: 0 0 0 1.4px var(--ink-stroke), var(--shadow-lift);
  min-width: 168px;
}
.layers-menu .btn {
  width: 100%;
}
</style>

<style>
/* Leaflet no estilo do app (global: os elementos são do Leaflet) */
.leaflet-container {
  background: var(--paper-3);
  font-family: var(--f-ui);
}
.leaflet-control-attribution {
  background: color-mix(in srgb, var(--paper-2) 88%, transparent) !important;
  color: var(--ink-3) !important;
  font-size: 10px !important;
  padding: 1px 8px !important;
  border-radius: 10px 0 0 0;
}
.leaflet-control-attribution a {
  color: var(--ink-3) !important;
  text-decoration: none;
}
.leaflet-control-attribution svg {
  display: none !important;
}
.leaflet-control-scale-line {
  background: color-mix(in srgb, var(--paper-2) 80%, transparent);
  border-color: var(--ink-stroke);
  color: var(--ink);
  font-family: var(--f-mono);
}
.leaflet-tooltip {
  background: var(--ink);
  color: var(--paper-2);
  border: 0;
  box-shadow: none;
  font: 500 11px var(--f-mono);
  padding: 3px 8px;
  border-radius: 6px;
}
.leaflet-tooltip::before {
  display: none;
}
.mat-poly {
  cursor: move;
}
.rot-handle {
  cursor: grab;
}
.poly-draw {
  stroke-dasharray: 2400;
  stroke-dashoffset: 2400;
  animation: poly-draw 1.3s cubic-bezier(0.215, 0.61, 0.355, 1) forwards;
}
@keyframes poly-draw {
  to {
    stroke-dashoffset: 0;
  }
}
</style>
