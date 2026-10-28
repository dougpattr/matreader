/* Desenho técnico do polígono num canvas — usado pela tela (modo Desenho)
   e pelo croqui que vai na impressão e no PNG. Nítido em telas densas. */
import { fmt } from '@/core/format';
import type { GeoKind, Pt } from '@/domain/geo/geometry';
import type { Segmento } from '@/domain/matricula/types';

export interface PaintOptions {
  zoom?: number;
  ox?: number;
  oy?: number;
  labels?: string[];
  segments?: Segmento[];
  measures?: boolean;
  forPrint?: boolean;
  colors?: { ink: string; soft: string; accent: string; fill: string; paper?: string };
}

export function paintPolygon(ctx: CanvasRenderingContext2D, W: number, H: number, pts: Pt[] | null, kind: GeoKind, o: PaintOptions = {}): boolean {
  const { zoom = 1, ox = 0, oy = 0, measures = false, forPrint = false } = o;
  ctx.clearRect(0, 0, W, H);
  if (o.colors?.paper) {
    ctx.fillStyle = o.colors.paper;
    ctx.fillRect(0, 0, W, H);
  }
  if (!pts || pts.length < 2) return false;
  const col = o.colors ?? { ink: '#1e1c24', soft: '#66637a', accent: '#974a40', fill: 'rgba(151,74,64,.16)' };

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const aspect = kind === 'abs' ? Math.cos((((minY + maxY) / 2) * Math.PI) / 180) : 1;
  const w = (maxX - minX) * aspect || 1;
  const h = maxY - minY || 1;
  const pad = Math.max(36, Math.min(W, H) * 0.1);
  const scale = Math.min((W - pad * 2) / w, (H - pad * 2) / h);
  const offX = pad + (W - pad * 2 - w * scale) / 2;
  const offY = pad + (H - pad * 2 - h * scale) / 2;
  const S = (p: Pt) => ({
    x: zoom * (offX + (p.x - minX) * aspect * scale) + ox,
    y: zoom * (H - (offY + (p.y - minY) * scale)) + oy,
  });

  // grade de papel milimetrado, discreta
  if (!forPrint) {
    ctx.save();
    ctx.strokeStyle = col.soft;
    ctx.globalAlpha = 0.08;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < W; x += 32) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, H);
    }
    for (let y = 0; y < H; y += 32) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(W, y + 0.5);
    }
    ctx.stroke();
    ctx.restore();
  }

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  pts.forEach((p, i) => {
    const s = S(p);
    if (i) ctx.lineTo(s.x, s.y);
    else ctx.moveTo(s.x, s.y);
  });
  ctx.closePath();
  ctx.fillStyle = col.fill;
  ctx.fill();
  ctx.strokeStyle = col.ink;
  ctx.lineWidth = forPrint ? 1.4 : 2;
  ctx.stroke();

  if (measures && o.segments) {
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillStyle = col.soft;
    ctx.textAlign = 'center';
    for (let i = 0; i < pts.length - 1; i++) {
      const seg = o.segments[i];
      if (!seg) continue;
      const a = S(pts[i]!);
      const b = S(pts[i + 1]!);
      const parts = [seg.azimute_rumo, Number.isFinite(seg.distancia_m) ? `${fmt(seg.distancia_m)} m` : null].filter(Boolean);
      if (parts.length) ctx.fillText(parts.join(' · '), (a.x + b.x) / 2, (a.y + b.y) / 2 - 5);
    }
  }

  const showLabels = !!o.labels && pts.length <= 60;
  ctx.textAlign = 'left';
  ctx.font = '600 11px Montserrat, sans-serif';
  pts.forEach((p, i) => {
    const s = S(p);
    ctx.beginPath();
    ctx.fillStyle = i === 0 ? col.accent : col.ink;
    ctx.arc(s.x, s.y, i === 0 ? 6 : 3, 0, Math.PI * 2);
    ctx.fill();
    if (showLabels && (i < pts.length - 1 || pts.length <= 2)) {
      ctx.fillStyle = col.soft;
      ctx.fillText(o.labels![i] ?? `P${i + 1}`, s.x + 8, s.y - 8);
    }
  });

  // rosa dos ventos desenhada
  ctx.save();
  ctx.translate(W - 32, 34);
  ctx.strokeStyle = col.ink;
  ctx.fillStyle = col.ink;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 4, 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(-5, 10);
  ctx.lineTo(0, 6);
  ctx.lineTo(5, 10);
  ctx.closePath();
  ctx.fill();
  ctx.font = '700 11px Montserrat, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', 0, -14);
  ctx.restore();
  return true;
}

/** Croqui em PNG (fundo branco, traço preto) para impressão e download. */
export function croquiDataUrl(pts: Pt[] | null, kind: GeoKind, labels: string[], segments: Segmento[]): string | null {
  if (!pts || pts.length < 3) return null;
  const W = 900;
  const H = 640;
  const dpr = 2;
  const cv = document.createElement('canvas');
  cv.width = W * dpr;
  cv.height = H * dpr;
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  paintPolygon(ctx, W, H, pts, kind, {
    labels,
    segments,
    measures: true,
    forPrint: true,
    colors: { ink: '#111', soft: '#555', accent: '#444', fill: 'rgba(0,0,0,.06)', paper: '#fff' },
  });
  return cv.toDataURL('image/png');
}
