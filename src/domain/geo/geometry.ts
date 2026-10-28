/* Geometria do terreno. Memorial brasileiro fala em azimute/rumo +
   distância e às vezes em coordenadas — geográficas ou UTM (SIGEF/INCRA).
   Tudo vira um plano único aqui; as contas pesadas vão ao núcleo
   (WebAssembly quando disponível). */
import type { Fit, Matricula, Segmento } from '@/domain/matricula/types';
import { parseNum } from '@/core/format';
import { parseAnchor, parseAngle, parseCoord, type LatLon } from './angles';
import { kernel } from './kernel';

export type GeoKind = 'abs' | 'rel' | 'none';

export interface Pt {
  x: number;
  y: number;
}

export interface Geometry {
  kind: GeoKind;
  /** abs: x = longitude, y = latitude · rel: metros a partir do vértice inicial */
  points: Pt[];
  labels: string[];
  usedUtm: boolean;
  anchorFromData: LatLon | null;
  declared: number;
  /** lances sem azimute ou distância legível (ignorados na caminhada) */
  skipped: number;
}

export const emptyGeometry = (): Geometry => ({
  kind: 'none',
  points: [],
  labels: [],
  usedUtm: false,
  anchorFromData: null,
  declared: 0,
  skipped: 0,
});

export interface ZoneInfo {
  zone: number | null;
  south: boolean;
}

/** Zona UTM declarada ("23S", "22 K", "fuso 23"). */
export function utmZoneInfo(data: Matricula | null): ZoneInfo {
  const g = data?.georreferenciamento ?? {};
  const raw = String(g.zona_utm ?? g.fuso ?? '').toUpperCase();
  const m = raw.match(/(\d{1,2})\s*([A-Z])?/);
  let zone: number | null = m ? parseInt(m[1]!, 10) : null;
  let south = true; // Brasil: quase tudo no hemisfério sul
  if (m && m[2]) {
    // "23S" no Brasil é fuso 23 SUL — não a faixa MGRS S (hemisfério norte).
    if (m[2] === 'S') south = true;
    else if (m[2] === 'N') south = false;
    else south = 'CDEFGHJKLM'.includes(m[2]);
  }
  if (/NORTE/.test(raw) && !/SUL/.test(raw)) south = false;
  if (/SUL/.test(raw)) south = true;
  if (!zone || zone < 1 || zone > 60) zone = null;
  return { zone, south };
}

export function vertexLabel(seg: Partial<Segmento> | undefined, i: number): string {
  const src = String(seg?.vertice_origem ?? seg?.segmento_descricao ?? '');
  const m = src.match(/\b(?:VT|EST|MP|P|V|M|E)[-\s]?\d+[A-Z]?\b/i);
  return m ? m[0].toUpperCase().replace(/\s+/g, '-') : `P${i + 1}`;
}

interface AbsPoint {
  lat: number;
  lon: number;
  utm: boolean;
}

/** Vértices absolutos de cada lance — graus decimais, DMS ou UTM
 *  (inclusive quando a IA põe metros UTM no campo de grau). UTM é
 *  convertida em lote no núcleo geométrico. */
export function absolutePoints(segs: Segmento[], zi: ZoneInfo): (AbsPoint | null)[] {
  const out: (AbsPoint | null)[] = new Array(segs.length).fill(null);
  const utmIdx: number[] = [];
  const es: number[] = [];
  const ns: number[] = [];
  segs.forEach((s, i) => {
    const lat = parseCoord(s.coordenada_y);
    const lon = parseCoord(s.coordenada_x);
    const looksUtm = (Number.isFinite(lat) && Math.abs(lat) > 90) || (Number.isFinite(lon) && Math.abs(lon) > 180);
    const hasUtm = Number.isFinite(s.utm_e) && Number.isFinite(s.utm_n);
    if (hasUtm || looksUtm) {
      const e = hasUtm ? s.utm_e : parseNum(s.coordenada_x);
      const n = hasUtm ? s.utm_n : parseNum(s.coordenada_y);
      if (Number.isFinite(e) && Number.isFinite(n) && zi.zone) {
        utmIdx.push(i);
        es.push(e);
        ns.push(n);
      }
      return;
    }
    if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      out[i] = { lat, lon, utm: false };
    }
  });
  if (utmIdx.length && zi.zone) {
    const g = kernel().utmToGeo(Float64Array.from(es), Float64Array.from(ns), zi.zone, zi.south);
    utmIdx.forEach((segIndex, k) => {
      out[segIndex] = { lat: g.lat[k]!, lon: g.lon[k]!, utm: true };
    });
  }
  return out;
}

/** Monta a geometria a partir da matrícula. */
export function buildGeometry(data: Matricula | null): Geometry {
  const segs = data?.dados_geoespaciais ?? [];
  if (!segs.length) return emptyGeometry();
  const zi = utmZoneInfo(data);
  const abs = absolutePoints(segs, zi);
  const absPts: Pt[] = [];
  const absLabels: string[] = [];
  let usedUtm = false;
  abs.forEach((p, i) => {
    if (!p) return;
    absPts.push({ x: p.lon, y: p.lat });
    absLabels.push(vertexLabel(segs[i], i));
    usedUtm = usedUtm || p.utm;
  });
  if (absPts.length >= 3) {
    return {
      kind: 'abs',
      points: absPts,
      labels: absLabels,
      usedUtm,
      anchorFromData: { lat: absPts[0]!.y, lon: absPts[0]!.x },
      declared: segs.length,
      skipped: segs.length - absPts.length,
    };
  }

  // Relativa: caminhada por azimute e distância a partir do vértice inicial.
  const az: number[] = [];
  const dist: number[] = [];
  const labels = [vertexLabel(segs[0], 0)];
  let skipped = 0;
  segs.forEach((s, i) => {
    const a = parseAngle(s.azimute_rumo);
    const d = parseNum(s.distancia_m);
    if (!Number.isFinite(a) || !Number.isFinite(d) || d <= 0) {
      skipped++;
      return;
    }
    az.push(a);
    dist.push(d);
    labels.push(vertexLabel(segs[i + 1], i + 1));
  });
  if (az.length < 2) return { ...emptyGeometry(), declared: segs.length, skipped };
  const walk = kernel().traverse(Float64Array.from(az), Float64Array.from(dist));
  const points: Pt[] = Array.from(walk.x, (x, i) => ({ x, y: walk.y[i]! }));
  const first = abs.find((p): p is AbsPoint => !!p) ?? null;
  return {
    kind: 'rel',
    points,
    labels,
    usedUtm: !!first?.utm,
    anchorFromData: first ? { lat: first.lat, lon: first.lon } : null,
    declared: segs.length,
    skipped,
  };
}

/* ---------- ajustes do usuário (girar, espelhar, deslocar) ----------
   Aplicados por igual no desenho, no mapa e no KML. */

export function fitRel(pts: Pt[], fit: Fit): Pt[] {
  const rad = ((fit.rot || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return pts.map((p) => {
    const x = fit.flipX ? -p.x : p.x;
    const y = fit.flipY ? -p.y : p.y;
    return { x: x * cos + y * sin, y: -x * sin + y * cos };
  });
}

export function fitAbs(pts: Pt[], fit: Fit): Pt[] {
  const rot = fit.rot || 0;
  if (!rot && !fit.flipX && !fit.flipY && !fit.dLat && !fit.dLng) return pts.map((p) => ({ ...p }));
  let sx = 0;
  let sy = 0;
  pts.forEach((p) => {
    sx += p.x;
    sy += p.y;
  });
  const cx = sx / pts.length;
  const cy = sy / pts.length;
  const k = Math.max(0.05, Math.cos((cy * Math.PI) / 180));
  const rad = (rot * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return pts.map((p) => {
    let dx = (p.x - cx) * k;
    let dy = p.y - cy;
    if (fit.flipX) dx = -dx;
    if (fit.flipY) dy = -dy;
    const rx = dx * cos + dy * sin;
    const ry = -dx * sin + dy * cos;
    return { x: cx + rx / k + (fit.dLng || 0), y: cy + ry + (fit.dLat || 0) };
  });
}

export function geoPoints(geo: Geometry | null, fit: Fit): Pt[] | null {
  if (!geo || geo.kind === 'none') return null;
  return geo.kind === 'abs' ? fitAbs(geo.points, fit) : fitRel(geo.points, fit);
}

const M_PER_DEG = 111320;

/** Polígono em [lat, long] para o mapa e o KML. */
export function geoLatLngs(geo: Geometry | null, fit: Fit): [number, number][] | null {
  const pts = geoPoints(geo, fit);
  if (!pts || !geo) return null;
  if (geo.kind === 'abs') return pts.map((p) => [p.y, p.x]);
  const a = parseAnchor(fit.anchor);
  if (!a) return null;
  const mLat = 1 / M_PER_DEG;
  const mLon = 1 / (M_PER_DEG * Math.cos((a.lat * Math.PI) / 180));
  return pts.map((p) => [a.lat + p.y * mLat + (fit.dLat || 0), a.lon + p.x * mLon + (fit.dLng || 0)]);
}

export function toMeters(pts: Pt[], kind: GeoKind): Pt[] {
  if (kind !== 'abs') return pts.map((p) => ({ x: p.x, y: p.y }));
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  pts.forEach((p) => {
    minLat = Math.min(minLat, p.y);
    maxLat = Math.max(maxLat, p.y);
    minLon = Math.min(minLon, p.x);
  });
  const k = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  return pts.map((p) => ({ x: (p.x - minLon) * M_PER_DEG * k, y: (p.y - minLat) * M_PER_DEG }));
}

/** Anel sem o ponto de fechamento repetido. */
export function openRing(ptsM: Pt[]): Pt[] {
  const ring = ptsM.slice();
  if (ring.length > 2) {
    const a = ring[0]!;
    const b = ring[ring.length - 1]!;
    if (Math.hypot(a.x - b.x, a.y - b.y) < 0.5) ring.pop();
  }
  return ring;
}

export interface GeoSummary {
  area: number;
  perimeter: number;
  vertices: number;
  /** erro de fechamento (só na geometria por azimutes) */
  gap: number | null;
  closes: boolean;
  tol: number;
  kind: GeoKind;
  located: boolean;
  selfIntersections: number;
  duplicates: number;
}

export function geoSummary(geo: Geometry | null, fit: Fit): GeoSummary | null {
  const pts = geoPoints(geo, fit);
  if (!geo || !pts || pts.length < 3) return null;
  const ring = openRing(toMeters(pts, geo.kind));
  const x = Float64Array.from(ring, (p) => p.x);
  const y = Float64Array.from(ring, (p) => p.y);
  const k = kernel();
  const { area, perimeter } = k.ringMetrics(x, y);
  const last = pts[pts.length - 1]!;
  const gap = geo.kind === 'rel' ? Math.hypot(last.x - pts[0]!.x, last.y - pts[0]!.y) : null;
  const tol = Math.max(1, perimeter * 0.005);
  let duplicates = 0;
  for (let i = 1; i < ring.length; i++) {
    if (Math.hypot(ring[i]!.x - ring[i - 1]!.x, ring[i]!.y - ring[i - 1]!.y) < 0.01) duplicates++;
  }
  return {
    area,
    perimeter,
    vertices: ring.length,
    gap,
    closes: gap === null ? true : gap <= tol,
    tol,
    kind: geo.kind,
    located: geo.kind === 'abs' || !!parseAnchor(fit.anchor),
    selfIntersections: ring.length <= 4000 ? k.selfIntersections(x, y) : 0,
    duplicates,
  };
}

export function centroidLatLng(lls: [number, number][]): LatLon | null {
  if (!lls.length) return null;
  const lat = lls.reduce((s, p) => s + p[0], 0) / lls.length;
  const lon = lls.reduce((s, p) => s + p[1], 0) / lls.length;
  return { lat, lon };
}
