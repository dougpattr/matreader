/* Acervo: matrículas guardadas neste aparelho (IndexedDB), com busca,
   filtro por estado, ordenação, backup, planilha e salvamento automático. */
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { debounce, download } from '@/core/browser';
import { fmt } from '@/core/format';
import { toCsv } from '@/domain/export/csv';
import { libraryKey, searchIndex, type LibraryState } from '@/domain/matricula/library-key';
import { normalize } from '@/domain/matricula/normalize';
import { emptyFit, type Matricula } from '@/domain/matricula/types';
import { buildGeometry, geoSummary } from '@/domain/geo/geometry';
import { libraryDb, type LibraryRecord } from '@/services/library/library-db';
import { useMatriculaStore } from './matricula';
import { useSettingsStore } from './settings';

export type LibraryFilter = 'todas' | LibraryState;
export type LibrarySort = 'recentes' | 'numero' | 'comarca';

export interface SaveStatus {
  kind: 'ok' | 'warn' | 'bad' | 'mute' | '';
  text: string;
}

/** Registros da versão 2 guardavam âncora/rotação soltas e não tinham
 *  estado nem índice de busca: convertidos na leitura. */
function migrate(r: LibraryRecord): { rec: LibraryRecord; changed: boolean } {
  if (r.fit && r.busca && r.estado) return { rec: r, changed: false };
  let data: Matricula | null = null;
  try {
    data = r.json ? normalize(r.json) : null;
  } catch {}
  const fit = r.fit ?? { ...emptyFit(), anchor: r.anchor ?? '', rot: r.rotation ?? 0, flipX: !!r.flipX, flipY: !!r.flipY };
  const rec: LibraryRecord = {
    ...r,
    fit,
    busca: r.busca ?? (data ? searchIndex(data) : String(r.numero ?? '').toLowerCase()),
    estado: r.estado ?? (r.geoOk ? 'geo' : data?.dados_geoespaciais.length ? 'rascunho' : 'sem'),
    cartorio: r.cartorio ?? '',
    comarca: r.comarca ?? '',
    denominacao: r.denominacao ?? '',
    numero: r.numero ?? 'S/N',
    savedAt: r.savedAt ?? Date.now(),
  };
  const newId = data ? libraryKey(data) : null;
  if (newId && newId !== r.id) rec.id = newId;
  return { rec, changed: true };
}

export const useLibraryStore = defineStore('library', () => {
  const mat = useMatriculaStore();
  const settings = useSettingsStore();

  const records = ref<LibraryRecord[]>([]);
  const loaded = ref(false);
  const filter = ref<LibraryFilter>('todas');
  const sort = ref<LibrarySort>('recentes');
  const query = ref('');
  const saveStatus = ref<SaveStatus>({ kind: '', text: '' });
  let lastHash = '';

  const counts = computed(() => ({
    todas: records.value.length,
    geo: records.value.filter((r) => r.estado === 'geo').length,
    rascunho: records.value.filter((r) => r.estado === 'rascunho').length,
    sem: records.value.filter((r) => r.estado === 'sem').length,
  }));

  const filtered = computed(() => {
    const q = query.value.toLowerCase().trim();
    const list = records.value.filter(
      (r) => (filter.value === 'todas' || r.estado === filter.value) && (!q || r.busca.includes(q) || String(r.numero).toLowerCase().includes(q)),
    );
    const byNum = (r: LibraryRecord) => parseFloat(String(r.numero).replace(/\D/g, '')) || 0;
    if (sort.value === 'numero') list.sort((a, b) => byNum(a) - byNum(b));
    else if (sort.value === 'comarca') list.sort((a, b) => a.comarca.localeCompare(b.comarca, 'pt-BR') || byNum(a) - byNum(b));
    else list.sort((a, b) => b.savedAt - a.savedAt);
    return list;
  });

  async function refresh() {
    try {
      const raw = await libraryDb.all();
      const seen = new Map<string, LibraryRecord>();
      const rewrite: LibraryRecord[] = [];
      const drop: string[] = [];
      for (const r of raw) {
        const { rec, changed } = migrate(r);
        if (changed) {
          rewrite.push(rec);
          if (rec.id !== r.id) drop.push(r.id);
        }
        const cur = seen.get(rec.id);
        if (!cur || rec.savedAt > cur.savedAt) seen.set(rec.id, rec);
      }
      records.value = [...seen.values()];
      for (const r of rewrite) await libraryDb.put(r).catch(() => {});
      for (const id of drop) await libraryDb.del(id).catch(() => {});
    } catch {
      records.value = [];
    }
    loaded.value = true;
  }

  function currentRecord(): LibraryRecord | null {
    const d = mat.data;
    if (!d || !mat.id) return null;
    const g = mat.summary;
    const estado: LibraryState = !g ? 'sem' : g.located && g.closes ? 'geo' : 'rascunho';
    const m = d.matricula;
    return {
      id: mat.id,
      numero: m.numero ?? 'S/N',
      cartorio: m.cartorio ?? '',
      comarca: [m.comarca, m.uf].filter(Boolean).join(' - '),
      denominacao: d.imovel.denominacao ?? '',
      estado,
      busca: searchIndex(d),
      json: d,
      fit: { ...mat.fit },
      savedAt: Date.now(),
      origem: mat.source ?? undefined,
    };
  }

  /** Salva a matrícula aberta. manual = pedido explícito (botão ou Ctrl+S). */
  async function saveCurrent(manual = false): Promise<SaveStatus> {
    if (!mat.data) return (saveStatus.value = { kind: '', text: '' });
    if (mat.isDemo && !manual) return (saveStatus.value = { kind: 'mute', text: 'exemplo — não é salvo' });
    if (mat.isDemo && manual) return (saveStatus.value = { kind: 'warn', text: 'o exemplo nunca é salvo' });
    if (!manual && !settings.autosave) return saveStatus.value;
    const rec = currentRecord();
    if (!rec) return (saveStatus.value = { kind: 'warn', text: 'sem número — não dá para salvar' });
    const hash = JSON.stringify([rec.id, rec.fit, rec.json]);
    if (!manual && hash === lastHash) return saveStatus.value;
    try {
      await libraryDb.put(rec);
      lastHash = hash;
      const i = records.value.findIndex((r) => r.id === rec.id);
      if (i >= 0) records.value.splice(i, 1, rec);
      else records.value.push(rec);
      const hora = new Date(rec.savedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return (saveStatus.value = { kind: 'ok', text: `salvo ${hora}` });
    } catch {
      return (saveStatus.value = { kind: 'bad', text: 'falha ao salvar' });
    }
  }

  const scheduleSave = debounce(() => void saveCurrent(false), 1500);
  watch(
    () => mat.revision,
    () => {
      if (!mat.data) {
        saveStatus.value = { kind: '', text: '' };
        lastHash = '';
        return;
      }
      scheduleSave();
    },
  );

  async function remove(id: string): Promise<() => Promise<void>> {
    const rec = records.value.find((r) => r.id === id);
    await libraryDb.del(id);
    records.value = records.value.filter((r) => r.id !== id);
    return async () => {
      if (!rec) return;
      await libraryDb.put(rec);
      records.value.push(rec);
    };
  }

  async function removeAll(): Promise<() => Promise<void>> {
    const backup = await libraryDb.all();
    await libraryDb.clear();
    records.value = [];
    return async () => {
      for (const r of backup) await libraryDb.put(r);
      await refresh();
    };
  }

  function open(rec: LibraryRecord) {
    return mat.loadText(JSON.stringify(rec.json), { source: 'acervo', fit: rec.fit ?? emptyFit(), id: rec.id });
  }

  async function exportBackup(): Promise<number> {
    const list = await libraryDb.all();
    if (!list.length) return 0;
    download(
      JSON.stringify({ tipo: 'backup-matriculas', versao: 1, app: 'MatReader 4', criado: new Date().toISOString(), registros: list }, null, 2),
      `Acervo_matriculas_${new Date().toISOString().slice(0, 10)}.json`,
      'application/json',
    );
    return list.length;
  }

  async function importBackup(file: File): Promise<number> {
    const parsed = JSON.parse(await file.text()) as unknown;
    const regs = Array.isArray(parsed) ? parsed : (parsed as { registros?: unknown })?.registros;
    if (!Array.isArray(regs)) throw new Error('arquivo sem lista de registros');
    let n = 0;
    for (const r of regs as LibraryRecord[]) {
      if (r && r.id && r.json) {
        await libraryDb.put(r);
        n++;
      }
    }
    await refresh();
    return n;
  }

  function exportCsv(): number {
    const rows: (string | number | null)[][] = [
      ['Matrícula', 'Cartório', 'Comarca', 'Denominação', 'Estado', 'Proprietários', 'Área declarada (m²)', 'Área calculada (m²)', 'Ônus ativos', 'CAR', 'SIGEF', 'Salva em'],
    ];
    for (const r of filtered.value) {
      let d: Matricula | null = null;
      try {
        d = normalize(r.json);
      } catch {}
      const g = d ? geoSummary(buildGeometry(d), r.fit ?? emptyFit()) : null;
      rows.push([
        r.numero,
        r.cartorio,
        r.comarca,
        r.denominacao,
        r.estado === 'geo' ? 'georreferenciada' : r.estado === 'rascunho' ? 'rascunho' : 'sem polígono',
        d?.proprietarios_atuais.map((p) => p.nome).filter(Boolean).join(' / ') ?? '',
        d && Number.isFinite(d.imovel.area_total_m2) ? fmt(d.imovel.area_total_m2) : '',
        g ? fmt(g.area) : '',
        d?.onus_e_gravames.filter((o) => o.situacao !== 'cancelado').map((o) => o.tipo).join(' / ') ?? '',
        String(d?.codigos_oficiais.car_numero ?? ''),
        String(d?.codigos_oficiais.codigo_sigef ?? ''),
        new Date(r.savedAt).toLocaleString('pt-BR'),
      ]);
    }
    download(toCsv(rows), `Acervo_matriculas_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8');
    return rows.length - 1;
  }

  return {
    records, loaded, filter, sort, query, saveStatus, counts, filtered,
    refresh, saveCurrent, remove, removeAll, open, exportBackup, importBackup, exportCsv,
  };
});
