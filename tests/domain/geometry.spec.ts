import { describe, expect, it } from 'vitest';
import { parseAngle, parseCoord, parseAnchor } from '@/domain/geo/angles';
import { buildGeometry, geoLatLngs, geoSummary, utmZoneInfo } from '@/domain/geo/geometry';
import { tsKernel, utmToLatLonScalar } from '@/domain/geo/kernel';
import { DEMO_MATRICULA } from '@/domain/matricula/demo';
import { normalize } from '@/domain/matricula/normalize';
import { emptyFit } from '@/domain/matricula/types';

describe('ângulos e coordenadas', () => {
  it.each([
    ["135°22'14\"", 135 + 22 / 60 + 14 / 3600],
    ["S 45°30' W", 225.5],
    ["45°30' SUL OESTE", 225.5],
    ['NE 30°', 30],
    ['N 45° E', 45],
    ['S 10° E', 170],
    ['N 20° W', 340],
    [90, 90],
    ['NOROESTE', 315],
  ])('azimute de %s', (input, expected) => {
    expect(parseAngle(input)).toBeCloseTo(expected as number, 6);
  });

  it('lê DMS e decimal com hemisfério', () => {
    expect(parseCoord('22°53\'44.5"S')).toBeCloseTo(-22.895694, 5);
    expect(parseCoord('-47.038583')).toBeCloseTo(-47.038583, 6);
    expect(parseCoord('47 02 18.9 W')).toBeCloseTo(-47.038583, 5);
  });

  it('âncora aceita vírgula ou ponto e vírgula', () => {
    expect(parseAnchor('-22.858, -47.193')).toEqual({ lat: -22.858, lon: -47.193 });
    expect(parseAnchor('-22,858; -47,193')).toEqual({ lat: -22.858, lon: -47.193 });
    expect(parseAnchor('abc')).toBeNull();
  });

  it('zona UTM "23S" é fuso 23 sul', () => {
    expect(utmZoneInfo(normalize(DEMO_MATRICULA))).toEqual({ zone: 23, south: true });
  });

  it('UTM 23S → geográficas dentro de SP', () => {
    const g = utmToLatLonScalar(262000, 7485000, 23, true);
    expect(g.lat).toBeGreaterThan(-23.4);
    expect(g.lat).toBeLessThan(-22.4);
    expect(g.lon).toBeGreaterThan(-48);
    expect(g.lon).toBeLessThan(-47);
  });
});

describe('geometria do exemplo', () => {
  const data = normalize(DEMO_MATRICULA);
  const geo = buildGeometry(data);

  it('caminha pelos azimutes e posiciona pela UTM do vértice inicial', () => {
    expect(geo.kind).toBe('rel');
    expect(geo.points).toHaveLength(7);
    expect(geo.usedUtm).toBe(true);
    expect(geo.anchorFromData).not.toBeNull();
  });

  it('fecha o polígono e calcula área próxima da declarada', () => {
    const fit = { ...emptyFit(), anchor: '-22.7, -47.3' };
    const s = geoSummary(geo, fit)!;
    expect(s.vertices).toBe(6);
    expect(s.closes).toBe(true);
    expect(s.gap!).toBeLessThan(1);
    expect(Math.abs(s.area - 126500) / 126500).toBeLessThan(0.05);
    expect(s.selfIntersections).toBe(0);
    expect(geoLatLngs(geo, fit)).toHaveLength(7);
  });

  it('detecta contorno que se cruza (gravata borboleta)', () => {
    const x = Float64Array.from([0, 10, 0, 10]);
    const y = Float64Array.from([0, 10, 10, 0]);
    expect(tsKernel.selfIntersections(x, y)).toBe(1);
  });
});
