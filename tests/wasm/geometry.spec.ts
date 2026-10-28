/* Paridade: o núcleo em WebAssembly tem de dar os mesmos números que a
   versão em TypeScript (tolerância de arredondamento de ponto flutuante). */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { tsKernel, type GeometryKernel } from '@/domain/geo/kernel';
import { instantiateGeometry } from '@/wasm/geometry-wasm';

let wasm: GeometryKernel;

beforeAll(async () => {
  const bytes = readFileSync(resolve(__dirname, '../../src/wasm/geometry.wasm'));
  wasm = await instantiateGeometry(bytes);
});

function randomPolygon(n: number, seed = 7) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const az = Float64Array.from({ length: n }, () => rnd() * 360);
  const dist = Float64Array.from({ length: n }, () => 5 + rnd() * 300);
  return { az, dist };
}

describe('núcleo geométrico WebAssembly × TypeScript', () => {
  it('é o módulo WebAssembly', () => {
    expect(wasm.name).toBe('wasm');
  });

  it('caminhada por azimutes igual', () => {
    const { az, dist } = randomPolygon(500);
    const a = wasm.traverse(az, dist);
    const b = tsKernel.traverse(az, dist);
    for (let i = 0; i < a.x.length; i++) {
      expect(a.x[i]).toBeCloseTo(b.x[i]!, 6);
      expect(a.y[i]).toBeCloseTo(b.y[i]!, 6);
    }
  });

  it('área, perímetro e cruzamentos iguais', () => {
    const { az, dist } = randomPolygon(300, 99);
    const { x, y } = tsKernel.traverse(az, dist);
    const ma = wasm.ringMetrics(x, y);
    const mb = tsKernel.ringMetrics(x, y);
    expect(ma.area).toBeCloseTo(mb.area, 4);
    expect(ma.perimeter).toBeCloseTo(mb.perimeter, 6);
    expect(wasm.selfIntersections(x, y)).toBe(tsKernel.selfIntersections(x, y));
  });

  it('conversão UTM em lote igual', () => {
    const e = Float64Array.from([262000, 300000, 650000.5, 500000]);
    const n = Float64Array.from([7485000, 7400000, 9000000, 8200000]);
    const a = wasm.utmToGeo(e, n, 23, true);
    const b = tsKernel.utmToGeo(e, n, 23, true);
    for (let i = 0; i < e.length; i++) {
      expect(a.lat[i]).toBeCloseTo(b.lat[i]!, 9);
      expect(a.lon[i]).toBeCloseTo(b.lon[i]!, 9);
    }
  });

  it('quadrado 100 × 100 tem 1 ha', () => {
    const x = Float64Array.from([0, 100, 100, 0]);
    const y = Float64Array.from([0, 0, 100, 100]);
    expect(wasm.ringMetrics(x, y)).toEqual({ area: 10000, perimeter: 400 });
  });
});
