/* Carregador do núcleo geométrico em WebAssembly.
   O módulo (geometry.wasm, ~6 KB) é compilado de wasm/geometry/assembly
   com AssemblyScript. Se o navegador não tiver WebAssembly ou o arquivo
   falhar, o app segue com a mesma matemática em TypeScript. */
import { useKernel, type GeometryKernel } from '@/domain/geo/kernel';
import wasmUrl from './geometry.wasm?url';

interface GeometryExports {
  memory: WebAssembly.Memory;
  alloc(bytes: number): number;
  reset(): void;
  traverse(az: number, dist: number, n: number, outX: number, outY: number): void;
  ringArea(x: number, y: number, n: number): number;
  ringPerimeter(x: number, y: number, n: number): number;
  selfIntersections(x: number, y: number, n: number): number;
  utmToGeo(e: number, n: number, len: number, zone: number, south: number, outLat: number, outLon: number): void;
}

const imports: WebAssembly.Imports = {
  env: {
    abort(_msg: number, _file: number, line: number, col: number) {
      throw new Error(`geometry.wasm abortou (linha ${line}, coluna ${col})`);
    },
  },
};

export function createWasmKernel(instance: WebAssembly.Instance): GeometryKernel {
  const ex = instance.exports as unknown as GeometryExports;
  const put = (arr: Float64Array): number => {
    const p = ex.alloc(Math.max(8, arr.length * 8));
    new Float64Array(ex.memory.buffer, p, arr.length).set(arr);
    return p;
  };
  const room = (n: number) => ex.alloc(Math.max(8, n * 8));
  const take = (p: number, n: number) => new Float64Array(ex.memory.buffer, p, n).slice();

  return {
    name: 'wasm',
    traverse(az, dist) {
      const n = Math.min(az.length, dist.length);
      ex.reset();
      const pa = put(az.subarray(0, n));
      const pd = put(dist.subarray(0, n));
      const px = room(n + 1);
      const py = room(n + 1);
      ex.traverse(pa, pd, n, px, py);
      return { x: take(px, n + 1), y: take(py, n + 1) };
    },
    ringMetrics(x, y) {
      const n = Math.min(x.length, y.length);
      ex.reset();
      const px = put(x);
      const py = put(y);
      return { area: ex.ringArea(px, py, n), perimeter: ex.ringPerimeter(px, py, n) };
    },
    selfIntersections(x, y) {
      const n = Math.min(x.length, y.length);
      ex.reset();
      const px = put(x);
      const py = put(y);
      return ex.selfIntersections(px, py, n);
    },
    utmToGeo(e, nn, zone, south) {
      const len = Math.min(e.length, nn.length);
      ex.reset();
      const pe = put(e);
      const pn = put(nn);
      const plat = room(len);
      const plon = room(len);
      ex.utmToGeo(pe, pn, len, zone, south ? 1 : 0, plat, plon);
      return { lat: take(plat, len), lon: take(plon, len) };
    },
  };
}

export async function instantiateGeometry(bytes: BufferSource): Promise<GeometryKernel> {
  const { instance } = await WebAssembly.instantiate(bytes, imports);
  return createWasmKernel(instance);
}

/** Carrega o .wasm do pacote e passa a usá-lo como núcleo ativo. */
export async function loadGeometryWasm(): Promise<GeometryKernel | null> {
  if (typeof WebAssembly !== 'object') return null;
  try {
    const res = fetch(wasmUrl);
    const { instance } =
      typeof WebAssembly.instantiateStreaming === 'function'
        ? await WebAssembly.instantiateStreaming(res, imports).catch(async () =>
            WebAssembly.instantiate(await (await fetch(wasmUrl)).arrayBuffer(), imports),
          )
        : await WebAssembly.instantiate(await (await res).arrayBuffer(), imports);
    const k = createWasmKernel(instance);
    useKernel(k);
    return k;
  } catch (e) {
    console.warn('[matreader] núcleo WebAssembly indisponível — seguindo em TypeScript.', e);
    return null;
  }
}
