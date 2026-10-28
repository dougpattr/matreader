/* KML do terreno, com ficha da matrícula no balão do Google Earth. */
import { fmt, fmtInt } from '@/core/format';
import { safeFileName } from '@/core/text';
import type { Geometry, GeoSummary } from '@/domain/geo/geometry';
import type { Fit, Matricula } from '@/domain/matricula/types';
import { zipStored } from './zip';

const x = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/]]>/g, ']]&gt;');

export type KmlResult = { ok: true; kml: string; name: string } | { ok: false; reason: string };

export function buildKml(
  d: Matricula,
  geo: Geometry,
  fit: Fit,
  lls: [number, number][] | null,
  g: GeoSummary | null,
  withVertices = true,
): KmlResult {
  if (!lls || lls.length < 3 || !g) {
    return {
      ok: false,
      reason:
        geo.kind === 'rel'
          ? 'Posicione o polígono no mapa antes de exportar (toque no satélite ou informe a coordenada de amarração).'
          : 'Esta matrícula não tem polígono para exportar.',
    };
  }
  const m = d.matricula;
  const numero = m.numero ?? 'S/N';
  const denom = d.imovel.denominacao ?? '';
  const nome = denom ? `Matrícula ${numero} — ${denom}` : `Matrícula ${numero}`;
  const coords = lls.map(([lat, lon]) => `${lon},${lat},0`).join(' ') + ` ${lls[0]![1]},${lls[0]![0]},0`;

  const rows: [string, string][] = [
    ['Área', `${fmt(g.area)} m² · ${fmt(g.area / 10000, 4)} ha`],
    ['Perímetro', `${fmt(g.perimeter)} m`],
    ['Vértices', fmtInt(g.vertices)],
  ];
  const c = d.codigos_oficiais;
  const gr = d.georreferenciamento;
  if (c.car_numero) rows.push(['CAR', String(c.car_numero)]);
  if (c.codigo_sigef) rows.push(['SIGEF', String(c.codigo_sigef)]);
  if (c.codigo_incra_ccir) rows.push(['CCIR / INCRA', String(c.codigo_incra_ccir)]);
  if (gr.datum) rows.push(['Datum', String(gr.datum)]);
  if (gr.zona_utm) rows.push(['Zona UTM', String(gr.zona_utm)]);
  const rowsHtml = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 0;color:#7a7686;white-space:nowrap;">${x(k)}</td><td style="padding:4px 0 4px 14px;text-align:right;font-weight:600;color:#1e1c24;">${x(v)}</td></tr>`,
    )
    .join('');
  const owners = d.proprietarios_atuais.length
    ? d.proprietarios_atuais
        .map(
          (o) =>
            `<div style="padding:2px 0;font-weight:600;color:#1e1c24;">${x(o.nome ?? '—')}${o.participacao_percentual !== null && Number.isFinite(o.participacao_percentual) ? ` <span style="color:#9b4f45;">${fmt(o.participacao_percentual, 0)}%</span>` : ''}</div>`,
        )
        .join('')
    : '<div style="color:#999;font-style:italic;">não identificado</div>';

  let vertices = '';
  if (withVertices && lls.length <= 300) {
    vertices =
      '<Folder><name>Vértices</name>' +
      lls
        .map(
          (ll, i) =>
            `<Placemark><name>${x(geo.labels[i] ?? `P${i + 1}`)}</name><Point><coordinates>${ll[1]},${ll[0]},0</coordinates></Point></Placemark>`,
        )
        .join('') +
      '</Folder>';
  }

  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document>
  <name>${x(nome)}</name>
  <Placemark>
    <name>${x(nome)}</name>
    <Style>
      <BalloonStyle><text><![CDATA[$[description]]]></text></BalloonStyle>
      <LineStyle><color>ff87675f</color><width>3.2</width></LineStyle>
      <PolyStyle><color>3387675f</color><fill>1</fill><outline>1</outline></PolyStyle>
    </Style>
    <description><![CDATA[<div style="font-family:Arial,Helvetica,sans-serif;width:290px;color:#1e1c24;font-size:13px;line-height:1.45;">
  <div style="font-size:15px;font-weight:700;">Matrícula nº ${x(numero)}</div>
  <div style="color:#7a7686;font-size:12px;margin:2px 0 9px;">${x(denom || m.cartorio || '')}</div>
  <div style="border-top:3px solid #5f6787;"></div>
  <table style="width:100%;border-collapse:collapse;font-size:13px;">${rowsHtml}</table>
  <div style="margin-top:10px;color:#999;font-size:11px;letter-spacing:.5px;">PROPRIETÁRIO(S)</div>
  ${owners}
  <div style="margin-top:9px;font-size:11px;color:#aaa;">${geo.kind === 'abs' ? 'Coordenadas da própria matrícula' : 'Geometria por azimutes e distâncias'}${fit.rot ? ` · giro ${fmt(fit.rot, 1)}°` : ''} · MatReader</div>
</div>]]></description>
    <Polygon><tessellate>1</tessellate><altitudeMode>clampToGround</altitudeMode>
      <outerBoundaryIs><LinearRing><coordinates>${coords}</coordinates></LinearRing></outerBoundaryIs>
    </Polygon>
  </Placemark>
  ${vertices}
</Document></kml>`;
  return { ok: true, kml, name: `Matricula_${safeFileName(String(numero))}` };
}

export function buildKmz(kml: string): Uint8Array {
  return zipStored([{ name: 'doc.kml', data: new TextEncoder().encode(kml) }]);
}
