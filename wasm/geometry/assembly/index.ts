// MatReader — núcleo geométrico em WebAssembly (AssemblyScript).
//
// Memória linear compartilhada com o JavaScript: o chamador reserva blocos
// com alloc(), escreve float64 neles e chama as funções com os ponteiros.
// reset() libera tudo de uma vez (runtime "stub": alocação por pilha).
// A versão TypeScript equivalente está em src/domain/geo/kernel.ts e os
// testes em tests/wasm/geometry.spec.ts conferem as duas lado a lado.

const DEG: f64 = Math.PI / 180.0;

@inline function at(ptr: usize, i: i32): usize {
  return ptr + (<usize>i << 3);
}

export function alloc(bytes: usize): usize {
  return heap.alloc(bytes);
}

export function reset(): void {
  heap.reset();
}

/** Caminhada por azimute (graus) e distância a partir de (0,0): n+1 pontos. */
export function traverse(azPtr: usize, distPtr: usize, n: i32, outX: usize, outY: usize): void {
  let x: f64 = 0.0;
  let y: f64 = 0.0;
  store<f64>(outX, 0.0);
  store<f64>(outY, 0.0);
  for (let i = 0; i < n; i++) {
    const r = load<f64>(at(azPtr, i)) * DEG;
    const d = load<f64>(at(distPtr, i));
    x += d * Math.sin(r);
    y += d * Math.cos(r);
    store<f64>(at(outX, i + 1), x);
    store<f64>(at(outY, i + 1), y);
  }
}

/** Área pela fórmula do laço (anel fechado implicitamente). */
export function ringArea(xPtr: usize, yPtr: usize, n: i32): f64 {
  let a2: f64 = 0.0;
  for (let i = 0; i < n; i++) {
    const j = i + 1 == n ? 0 : i + 1;
    a2 += load<f64>(at(xPtr, i)) * load<f64>(at(yPtr, j)) - load<f64>(at(xPtr, j)) * load<f64>(at(yPtr, i));
  }
  return Math.abs(a2) / 2.0;
}

export function ringPerimeter(xPtr: usize, yPtr: usize, n: i32): f64 {
  let per: f64 = 0.0;
  for (let i = 0; i < n; i++) {
    const j = i + 1 == n ? 0 : i + 1;
    const dx = load<f64>(at(xPtr, j)) - load<f64>(at(xPtr, i));
    const dy = load<f64>(at(yPtr, j)) - load<f64>(at(yPtr, i));
    per += Math.sqrt(dx * dx + dy * dy);
  }
  return per;
}

@inline function orient(px: f64, py: f64, qx: f64, qy: f64, rx: f64, ry: f64): f64 {
  return (qx - px) * (ry - py) - (qy - py) * (rx - px);
}

@inline function opposite(a: f64, b: f64): bool {
  const eps: f64 = 1e-9;
  return (a > eps && b < -eps) || (a < -eps && b > eps);
}

/** Pares de lados não adjacentes que se cruzam (contorno inválido). */
export function selfIntersections(xPtr: usize, yPtr: usize, n: i32): i32 {
  if (n < 4) return 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    const i2 = i + 1 == n ? 0 : i + 1;
    const ax = load<f64>(at(xPtr, i));
    const ay = load<f64>(at(yPtr, i));
    const bx = load<f64>(at(xPtr, i2));
    const by = load<f64>(at(yPtr, i2));
    for (let j = i + 2; j < n; j++) {
      const j2 = j + 1 == n ? 0 : j + 1;
      if (j2 == i) continue;
      const cx = load<f64>(at(xPtr, j));
      const cy = load<f64>(at(yPtr, j));
      const dx = load<f64>(at(xPtr, j2));
      const dy = load<f64>(at(yPtr, j2));
      if (opposite(orient(cx, cy, dx, dy, ax, ay), orient(cx, cy, dx, dy, bx, by)) &&
          opposite(orient(ax, ay, bx, by, cx, cy), orient(ax, ay, bx, by, dx, dy))) count++;
    }
  }
  return count;
}

/** UTM (SIRGAS2000 ≈ WGS84) → latitude/longitude em graus, em lote. */
export function utmToGeo(ePtr: usize, nPtr: usize, n: i32, zone: i32, south: bool, outLat: usize, outLon: usize): void {
  const a: f64 = 6378137.0;
  const f: f64 = 1.0 / 298.257223563;
  const k0: f64 = 0.9996;
  const e2 = f * (2.0 - f);
  const ep2 = e2 / (1.0 - e2);
  const e1 = (1.0 - Math.sqrt(1.0 - e2)) / (1.0 + Math.sqrt(1.0 - e2));
  const e1_2 = e1 * e1;
  const e1_3 = e1_2 * e1;
  const e1_4 = e1_3 * e1;
  const muDen = a * (1.0 - e2 / 4.0 - (3.0 * e2 * e2) / 64.0 - (5.0 * e2 * e2 * e2) / 256.0);
  const lon0 = (<f64>((zone - 1) * 6 - 180 + 3)) * DEG;
  for (let i = 0; i < n; i++) {
    const x = load<f64>(at(ePtr, i)) - 500000.0;
    const yRaw = load<f64>(at(nPtr, i));
    const y = south ? yRaw - 10000000.0 : yRaw;
    const mu = (y / k0) / muDen;
    const phi1 = mu +
      ((3.0 * e1) / 2.0 - (27.0 * e1_3) / 32.0) * Math.sin(2.0 * mu) +
      ((21.0 * e1_2) / 16.0 - (55.0 * e1_4) / 32.0) * Math.sin(4.0 * mu) +
      ((151.0 * e1_3) / 96.0) * Math.sin(6.0 * mu) +
      ((1097.0 * e1_4) / 512.0) * Math.sin(8.0 * mu);
    const sin1 = Math.sin(phi1);
    const cos1 = Math.cos(phi1);
    const tan1 = Math.tan(phi1);
    const N1 = a / Math.sqrt(1.0 - e2 * sin1 * sin1);
    const T1 = tan1 * tan1;
    const C1 = ep2 * cos1 * cos1;
    const R1 = (a * (1.0 - e2)) / Math.pow(1.0 - e2 * sin1 * sin1, 1.5);
    const D = x / (N1 * k0);
    const D2 = D * D;
    const D3 = D2 * D;
    const D4 = D3 * D;
    const D5 = D4 * D;
    const D6 = D5 * D;
    const lat = phi1 - ((N1 * tan1) / R1) * (
      D2 / 2.0 -
      ((5.0 + 3.0 * T1 + 10.0 * C1 - 4.0 * C1 * C1 - 9.0 * ep2) * D4) / 24.0 +
      ((61.0 + 90.0 * T1 + 298.0 * C1 + 45.0 * T1 * T1 - 252.0 * ep2 - 3.0 * C1 * C1) * D6) / 720.0);
    const lon = (D -
      ((1.0 + 2.0 * T1 + C1) * D3) / 6.0 +
      ((5.0 - 2.0 * C1 + 28.0 * T1 - 3.0 * C1 * C1 + 8.0 * ep2 + 24.0 * T1 * T1) * D5) / 120.0) / cos1;
    store<f64>(at(outLat, i), lat / DEG);
    store<f64>(at(outLon, i), (lon0 + lon) / DEG);
  }
}
