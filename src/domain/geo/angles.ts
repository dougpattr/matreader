/* Ângulos e coordenadas como aparecem em memoriais descritivos. */

const ACCENTS: [RegExp, string][] = [
  [/[ÁÀÂÃ]/g, 'A'],
  [/[ÉÊ]/g, 'E'],
  [/Í/g, 'I'],
  [/[ÓÔÕ]/g, 'O'],
  [/[ÚÜ]/g, 'U'],
];

/** Rumo/azimute em qualquer notação → azimute em graus [0, 360).
 *  135°22'14" · S 45°30' W · "45°30' SUL OESTE" · "NE 30°" · 135.37 */
export function parseAngle(input: unknown): number {
  if (input === null || input === undefined || input === '') return NaN;
  if (typeof input === 'number') return Number.isFinite(input) ? ((input % 360) + 360) % 360 : NaN;
  let s = String(input).toUpperCase();
  for (const [re, to] of ACCENTS) s = s.replace(re, to);
  s = s
    .replace(/\bNORDESTE\b/g, 'NE')
    .replace(/\bNOROESTE\b/g, 'NW')
    .replace(/\bSUDESTE\b/g, 'SE')
    .replace(/\bSUDOESTE\b/g, 'SW')
    .replace(/\bNORTE\b/g, 'N')
    .replace(/\bSUL\b/g, 'S')
    .replace(/\bLESTE\b/g, 'L')
    .replace(/\bESTE\b/g, 'L')
    .replace(/\bOESTE\b/g, 'W')
    .replace(/\bAZIMUTE\b|\bAZ\.?\b|\bRUMO\b/g, ' ');
  const nums = s.match(/\d+(?:[.,]\d+)?/g);
  if (!nums) {
    if (/\bNE\b/.test(s)) return 45;
    if (/\bSE\b/.test(s)) return 135;
    if (/\bSW\b|\bSO\b/.test(s)) return 225;
    if (/\bNW\b|\bNO\b/.test(s)) return 315;
    if (/\bN\b/.test(s)) return 0;
    if (/\bL\b|\bE\b/.test(s)) return 90;
    if (/\bS\b/.test(s)) return 180;
    if (/\bW\b|\bO\b/.test(s)) return 270;
    return NaN;
  }
  const d = parseFloat(nums[0]!.replace(',', '.')) || 0;
  const mi = nums[1] ? parseFloat(nums[1].replace(',', '.')) : 0;
  const se = nums[2] ? parseFloat(nums[2].replace(',', '.')) : 0;
  const dec = d + mi / 60 + se / 3600;
  // Quadrante: letra vertical antes do número, horizontal depois.
  const idx = s.indexOf(nums[0]!);
  const before = s.slice(0, idx);
  const after = s.slice(idx + nums[0]!.length);
  const vert = /S/.test(before)
    ? 'S'
    : /N/.test(before)
      ? 'N'
      : /S/.test(after) && !/N/.test(after)
        ? 'S'
        : /N/.test(after)
          ? 'N'
          : '';
  const horz = /W|\bO\b/.test(after)
    ? 'W'
    : /E|L/.test(after)
      ? 'E'
      : /W|\bO\b/.test(before)
        ? 'W'
        : /E|L/.test(before)
          ? 'E'
          : '';
  let az = dec;
  if (vert === 'S' && horz === 'E') az = 180 - dec;
  else if (vert === 'S' && horz === 'W') az = 180 + dec;
  else if (vert === 'N' && horz === 'W') az = 360 - dec;
  return ((az % 360) + 360) % 360;
}

/** Coordenada geográfica: "-22.895694" · 22°53'44.5"S · "22 53 44.5 S" */
export function parseCoord(input: unknown): number {
  if (input === null || input === undefined || input === '') return NaN;
  if (typeof input === 'number') return Number.isFinite(input) ? input : NaN;
  const s = String(input).trim().toUpperCase().replace(/\\"/g, '"');
  const hemi = /(^|[^A-Z])([NSEWOL])([^A-Z]|$)/.test(s) ? ((s.match(/[NSWOL](?![A-Z])/g) ?? [])[0] ?? '') : '';
  const neg = s.includes('-') || hemi === 'S' || hemi === 'W' || hemi === 'O';
  const nums = s.match(/\d+(?:[.,]\d+)?/g);
  if (!nums) return NaN;
  const parts = nums.map((n) => parseFloat(n.replace(',', '.')));
  const dec = parts.length === 1 ? parts[0]! : Math.abs(parts[0]!) + (parts[1] ?? 0) / 60 + (parts[2] ?? 0) / 3600;
  if (!Number.isFinite(dec)) return NaN;
  return neg ? -Math.abs(dec) : dec;
}

export interface LatLon {
  lat: number;
  lon: number;
}

/** "lat, long" digitado pelo usuário (vírgula ou ponto e vírgula). */
export function parseAnchor(txt: unknown): LatLon | null {
  const m = String(txt ?? '')
    .trim()
    .match(/^(-?\d+(?:[.,]\d+)?)\s*[,;]\s*(-?\d+(?:[.,]\d+)?)$/);
  if (!m) return null;
  const lat = parseFloat(m[1]!.replace(',', '.'));
  const lon = parseFloat(m[2]!.replace(',', '.'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

export const formatAnchor = (p: LatLon) => `${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}`;

/** Limites aproximados do território brasileiro (com folga). */
export function insideBrazil(lat: number, lon: number): boolean {
  return lat >= -34 && lat <= 6 && lon >= -74 && lon <= -28;
}
