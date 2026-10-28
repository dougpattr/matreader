/* A matrícula aberta: dados normalizados, geometria, ajustes do usuário e
   conferências. Um caminho só para arquivo, colagem, exemplo, IA e acervo. */
import { defineStore } from 'pinia';
import { computed, reactive, ref, shallowRef } from 'vue';
import { local } from '@/core/browser';
import { formatAnchor } from '@/domain/geo/angles';
import { buildGeometry, emptyGeometry, geoLatLngs, geoPoints, geoSummary, type Geometry } from '@/domain/geo/geometry';
import { checkStats, runChecks } from '@/domain/matricula/checks';
import { DEMO_MATRICULA } from '@/domain/matricula/demo';
import { JsonLooseError, parseLoose } from '@/domain/matricula/json-loose';
import { libraryKey } from '@/domain/matricula/library-key';
import { isMatricula, findMatricula, normalize } from '@/domain/matricula/normalize';
import { emptyFit, type Fit, type FlowMeta, type Matricula } from '@/domain/matricula/types';

export type Source = 'ia' | 'arquivo' | 'colagem' | 'exemplo' | 'acervo' | 'editor' | 'sessao';

export interface LoadOptions {
  source: Source;
  demo?: boolean;
  fit?: Fit;
  id?: string | null;
  meta?: FlowMeta | null;
  /** reescreve o editor com o JSON normalizado e indentado */
  reformat?: boolean;
}

export type LoadResult =
  | { ok: true; repairs: string[] }
  | { ok: false; kind: 'vazio' | 'json' | 'formato'; message: string };

interface Snapshot {
  text: string;
  fit: Fit;
  id: string | null;
  demo: boolean;
  meta: FlowMeta | null;
}

const SESSION_KEY = 'matreader:sessao';

export const useMatriculaStore = defineStore('matricula', () => {
  const data = shallowRef<Matricula | null>(null);
  const geo = shallowRef<Geometry>(emptyGeometry());
  const fit = reactive<Fit>(emptyFit());
  const id = ref<string | null>(null);
  const isDemo = ref(false);
  const source = ref<Source | null>(null);
  const meta = shallowRef<FlowMeta | null>(null);
  const repairs = ref<string[]>([]);
  const truncatedResponse = ref(false);
  const editorText = ref('');
  const editorStatus = ref<{ kind: 'info' | 'ok' | 'err'; text: string }>({ kind: 'info', text: 'Aguardando conteúdo' });
  /** muda a cada carga/ajuste: gatilho do salvamento e das animações */
  const revision = ref(0);
  const loadedAt = ref(0);

  const points = computed(() => geoPoints(geo.value, fit));
  const latLngs = computed(() => geoLatLngs(geo.value, fit));
  const summary = computed(() => geoSummary(geo.value, fit));
  const checks = computed(() =>
    runChecks(data.value, {
      geo: geo.value,
      summary: summary.value,
      latLngs: latLngs.value,
      meta: meta.value,
      truncatedResponse: truncatedResponse.value,
    }),
  );
  const stats = computed(() => checkStats(checks.value));
  const hasGeo = computed(() => geo.value.kind !== 'none');
  const label = computed(() => (data.value?.matricula.numero ? `Matrícula ${data.value.matricula.numero}` : 'Matrícula sem número'));

  function setFitAll(next: Fit) {
    Object.assign(fit, emptyFit(), next);
  }

  function loadText(raw: string, opts: LoadOptions): LoadResult {
    const text = String(raw ?? '');
    if (!text.trim()) {
      editorStatus.value = { kind: 'info', text: 'Aguardando conteúdo' };
      return { ok: false, kind: 'vazio', message: 'Nada para ler.' };
    }
    let parsed;
    try {
      parsed = parseLoose(text);
    } catch (e) {
      const message = e instanceof JsonLooseError ? e.message : String((e as Error)?.message ?? e);
      editorStatus.value = { kind: 'err', text: message };
      return { ok: false, kind: 'json', message };
    }
    const found = findMatricula(parsed.data);
    if (!found || !isMatricula(found)) {
      const message = 'O conteúdo é JSON, mas não parece uma matrícula (faltam matricula / imovel / dados_geoespaciais).';
      editorStatus.value = { kind: 'err', text: message };
      return { ok: false, kind: 'formato', message };
    }
    const next = normalize(found);
    const nextId = opts.id ?? libraryKey(next);
    const same = !!data.value && !!nextId && nextId === id.value;

    data.value = next;
    isDemo.value = !!opts.demo;
    source.value = opts.source;
    id.value = nextId;
    meta.value = opts.meta ?? (same ? meta.value : null);
    repairs.value = parsed.repairs;
    truncatedResponse.value = parsed.truncated;
    if (opts.fit) setFitAll(opts.fit);
    else if (!same) setFitAll(emptyFit());
    geo.value = buildGeometry(next);
    if (!fit.anchor && geo.value.kind === 'rel' && geo.value.anchorFromData) fit.anchor = formatAnchor(geo.value.anchorFromData);

    if (opts.reformat !== false) editorText.value = JSON.stringify(next, null, 2);
    else editorText.value = text;
    const rep = parsed.repairs.length ? ` · reparado: ${parsed.repairs.join(', ')}` : '';
    editorStatus.value = { kind: 'ok', text: `JSON válido · ${(editorText.value.length / 1024).toFixed(1)} KB${rep}` };
    loadedAt.value = Date.now();
    revision.value++;
    persistSession();
    return { ok: true, repairs: parsed.repairs };
  }

  function loadDemo(): LoadResult {
    return loadText(JSON.stringify(DEMO_MATRICULA), { source: 'exemplo', demo: true });
  }

  function touchFit() {
    revision.value++;
    persistSession();
  }

  function setRotation(deg: number) {
    const d = ((((deg + 180) % 360) + 360) % 360) - 180;
    fit.rot = Math.round(d * 10) / 10;
    touchFit();
  }

  function setAnchor(txt: string) {
    fit.anchor = txt;
    touchFit();
  }

  function patchFit(p: Partial<Fit>) {
    Object.assign(fit, p);
    touchFit();
  }

  /** Desfaz giro, espelho e deslocamento; devolve como desfazer. */
  function resetFit(): () => void {
    const before = { ...fit };
    patchFit({ rot: 0, flipX: false, flipY: false, dLat: 0, dLng: 0 });
    return () => {
      setFitAll(before);
      touchFit();
    };
  }

  function snapshot(): Snapshot {
    return { text: editorText.value, fit: { ...fit }, id: id.value, demo: isDemo.value, meta: meta.value };
  }

  /** Fecha a matrícula atual; devolve como reabrir. */
  function clear(): () => void {
    const snap = snapshot();
    data.value = null;
    geo.value = emptyGeometry();
    setFitAll(emptyFit());
    id.value = null;
    isDemo.value = false;
    source.value = null;
    meta.value = null;
    repairs.value = [];
    truncatedResponse.value = false;
    editorText.value = '';
    editorStatus.value = { kind: 'info', text: 'Aguardando conteúdo' };
    revision.value++;
    local.del(SESSION_KEY);
    return () => {
      if (snap.text) loadText(snap.text, { source: 'sessao', fit: snap.fit, id: snap.id, demo: snap.demo, meta: snap.meta, reformat: false });
    };
  }

  function persistSession() {
    if (!data.value) return;
    local.setJson(SESSION_KEY, { data: data.value, fit: { ...fit }, id: id.value, demo: isDemo.value, meta: meta.value });
  }

  function restoreSession(): boolean {
    const last = local.json<{ data?: unknown; fit?: Fit; id?: string; demo?: boolean; meta?: FlowMeta } | null>(SESSION_KEY, null);
    if (last?.data) {
      return loadText(JSON.stringify(last.data), { source: 'sessao', fit: last.fit, id: last.id, demo: last.demo, meta: last.meta ?? null }).ok;
    }
    // sessão deixada pela versão anterior
    const legacy = local.json<{ data?: unknown; fit?: Fit; id?: string; demo?: boolean } | null>('mat_last', null);
    if (legacy?.data) return loadText(JSON.stringify(legacy.data), { source: 'sessao', fit: legacy.fit, id: legacy.id, demo: legacy.demo }).ok;
    return false;
  }

  return {
    data, geo, fit, id, isDemo, source, meta, repairs, truncatedResponse, editorText, editorStatus, revision, loadedAt,
    points, latLngs, summary, checks, stats, hasGeo, label,
    loadText, loadDemo, setRotation, setAnchor, patchFit, resetFit, clear, restoreSession, persistSession,
  };
});
