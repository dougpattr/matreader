/* Núcleo geométrico — contrato único com duas implementações:
   WebAssembly (src/wasm/geometry-wasm.ts, compilado de AssemblyScript)
   e TypeScript (esta, usada como reserva e como referência nos testes).
   As duas recebem e devolvem arrays planos de float64. */

export interface GeometryKernel {
  readonly name: 'wasm' | 'ts';
  /** Caminhada por azimute (graus) e distância (m) a partir de (0,0).
   *  Devolve n+1 pontos em x (leste) e y (norte). */
  traverse(az: Float64Array, dist: Float64Array): { x: Float64Array; y: Float64Array };
  /** Área (fórmula do laço) e perímetro de um anel fechado implicitamente. */
  ringMetrics(x: Float64Array, y: Float64Array): { area: number; perimeter: number };
  /** Quantos pares de lados não adjacentes se cruzam. */
  selfIntersections(x: Float64Array, y: Float64Array): number;
  /** UTM (SIRGAS2000 ≈ WGS84) → geográficas, em lote. */
  utmToGeo(e: Float64Array, n: Float64Array, zone: number, south: boolean): { lat: Float64Array; lon: Float64Array };
}

const DEG = Math.PI / 180;

export function utmToLatLonScalar(easting: number, northing: number, zone: number, south: boolean) {
  const a = 6378137;
  const f = 1 / 298.257223563;
  const k0 = 0.9996;
  const e2 = f * (2 - f);
  const ep2 = e2 / (1 - e2);
  const x = easting - 500000;
  const y = south ? northing - 10000000 : northing;
  const M = y / k0;
  const mu = M / (a * (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);
  const sin1 = Math.sin(phi1);
  const cos1 = Math.cos(phi1);
  const tan1 = Math.tan(phi1);
  const N1 = a / Math.sqrt(1 - e2 * sin1 * sin1);
  const T1 = tan1 * tan1;
  const C1 = ep2 * cos1 * cos1;
  const R1 = (a * (1 - e2)) / Math.pow(1 - e2 * sin1 * sin1, 1.5);
  const D = x / (N1 * k0);
  const lat =
    phi1 -
    ((N1 * tan1) / R1) *
      ((D * D) / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D ** 4) / 24 +
        ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D ** 6) / 720);
  const lon =
    (D -
      ((1 + 2 * T1 + C1) * D ** 3) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D ** 5) / 120) /
    cos1;
  const lon0 = ((zone - 1) * 6 - 180 + 3) * DEG;
  return { lat: lat / DEG, lon: (lon0 + lon) / DEG };
}

/** Orientação do trio (p, q, r): >0 anti-horário, <0 horário, 0 colinear. */
function orient(px: number, py: number, qx: number, qy: number, rx: number, ry: number): number {
  return (qx - px) * (ry - py) - (qy - py) * (rx - px);
}

function segmentsCross(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number,
): boolean {
  const eps = 1e-9;
  const d1 = orient(cx, cy, dx, dy, ax, ay);
  const d2 = orient(cx, cy, dx, dy, bx, by);
  const d3 = orient(ax, ay, bx, by, cx, cy);
  const d4 = orient(ax, ay, bx, by, dx, dy);
  return ((d1 > eps && d2 < -eps) || (d1 < -eps && d2 > eps)) && ((d3 > eps && d4 < -eps) || (d3 < -eps && d4 > eps));
}

export const tsKernel: GeometryKernel = {
  name: 'ts',
  traverse(az, dist) {
    const n = Math.min(az.length, dist.length);
    const x = new Float64Array(n + 1);
    const y = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) {
      const r = az[i]! * DEG;
      x[i + 1] = x[i]! + dist[i]! * Math.sin(r);
      y[i + 1] = y[i]! + dist[i]! * Math.cos(r);
    }
    return { x, y };
  },
  ringMetrics(x, y) {
    const n = x.length;
    let a2 = 0;
    let per = 0;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      a2 += x[i]! * y[j]! - x[j]! * y[i]!;
      per += Math.hypot(x[j]! - x[i]!, y[j]! - y[i]!);
    }
    return { area: Math.abs(a2) / 2, perimeter: per };
  },
  selfIntersections(x, y) {
    const n = x.length;
    if (n < 4) return 0;
    let count = 0;
    for (let i = 0; i < n; i++) {
      const i2 = (i + 1) % n;
      for (let j = i + 2; j < n; j++) {
        const j2 = (j + 1) % n;
        if (j2 === i) continue; // lados vizinhos (último com o primeiro)
        if (segmentsCross(x[i]!, y[i]!, x[i2]!, y[i2]!, x[j]!, y[j]!, x[j2]!, y[j2]!)) count++;
      }
    }
    return count;
  },
  utmToGeo(e, n, zone, south) {
    const len = Math.min(e.length, n.length);
    const lat = new Float64Array(len);
    const lon = new Float64Array(len);
    for (let i = 0; i < len; i++) {
      const g = utmToLatLonScalar(e[i]!, n[i]!, zone, south);
      lat[i] = g.lat;
      lon[i] = g.lon;
    }
    return { lat, lon };
  },
};

/** Núcleo ativo: começa em TypeScript e troca para WebAssembly quando o
 *  módulo termina de carregar (veja src/wasm/geometry-wasm.ts). */
let active: GeometryKernel = tsKernel;
export const kernel = (): GeometryKernel => active;
export function useKernel(k: GeometryKernel): void {
  active = k;
}
