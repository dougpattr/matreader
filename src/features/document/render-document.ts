/* O documento da matrícula montado em HTML a partir dos dados
   normalizados. Função pura: a mesma saída serve à tela e à impressão.
   Todo texto vindo da IA passa por esc(). */
import { fmt, fmtArea, fmtDate, fmtInt, fmtMoney, dateValue, parseNum } from '@/core/format';
import { esc, show, val } from '@/core/text';
import { parseCoord } from '@/domain/geo/angles';
import type { GeoSummary } from '@/domain/geo/geometry';
import { docStatus } from '@/domain/matricula/documents';
import type { Check, Matricula } from '@/domain/matricula/types';

export interface DocSection {
  id: string;
  label: string;
}

export interface RenderOptions {
  demo: boolean;
  summary: GeoSummary | null;
  checks: Check[];
  croqui?: string | null;
  forPrint?: boolean;
  now?: Date;
}

const sv = (v: unknown, fb = '—') => esc(show(v, fb));

function statusChip(txt: string | null): string {
  const s = String(txt ?? '').toLowerCase();
  if (!val(txt)) return '<span class="chip chip--mute">situação não informada</span>';
  if (s.includes('ativ')) return `<span class="chip chip--ok">${esc(txt)}</span>`;
  if (/encerr|cancel/.test(s)) return `<span class="chip chip--bad">${esc(txt)}</span>`;
  return `<span class="chip chip--mute">${esc(txt)}</span>`;
}

function copyBtn(v: unknown, forPrint?: boolean): string {
  if (forPrint) return '';
  return `<button type="button" class="copybtn" data-copy="${esc(v)}" title="Copiar" aria-label="Copiar ${esc(v)}"><svg class="ink-icon sm" aria-hidden="true"><use href="#ink-copy"/></svg></button>`;
}

function docBadge(doc: unknown): string {
  const st = docStatus(doc);
  if (st === 'ok') return '<span class="chip chip--ok" title="Dígito verificador confere">confere</span>';
  if (st === 'bad') return '<span class="chip chip--bad" title="O dígito verificador não bate: confira a transcrição">dígito não bate</span>';
  return '';
}

function rubric(n: string, title: string, note = ''): string {
  return `<div class="rubric"><span class="n">${n}</span><h3>${esc(title)}</h3>${note ? `<span class="note">${note}</span>` : ''}</div>`;
}

export function renderDocument(d: Matricula, o: RenderOptions): { html: string; sections: DocSection[] } {
  const m = d.matricula;
  const im = d.imovel;
  const secs: DocSection[] = [];
  let h = '';

  h += `<header class="doc-header">
    <div>
      <p class="doc-label">Registro de Imóveis · Matrícula</p>
      <div class="doc-num"><span class="nowrap"><small>Nº</small> ${sv(m.numero, 'S/N')}</span>${statusChip(m.status_matricula)}</div>
      ${o.demo ? '<p class="doc-demo"><span class="chip chip--warn">exemplo fictício</span></p>' : ''}
    </div>
    <div class="doc-cart">
      <b>${sv(m.cartorio)}</b>
      ${sv(m.comarca, '')}${val(m.uf) ? ' · ' + esc(m.uf) : ''}<br>
      ${val(m.codigo_cns) ? 'CNS ' + esc(m.codigo_cns) : ''}
      ${val(m.data_abertura) ? '<br>aberta em ' + esc(fmtDate(m.data_abertura)) : ''}
    </div>
  </header>`;

  /* 01 · titularidade */
  secs.push({ id: 'titularidade', label: 'Titularidade' });
  h += `<section id="sec-titularidade">${rubric('01', 'Titularidade atual', d.proprietarios_atuais.length > 1 ? `${d.proprietarios_atuais.length} proprietários` : '')}`;
  if (d.proprietarios_atuais.length) {
    for (const p of d.proprietarios_atuais) {
      const pct =
        p.participacao_percentual !== null && Number.isFinite(p.participacao_percentual)
          ? `<span class="chip chip--info">${fmt(p.participacao_percentual, p.participacao_percentual % 1 ? 2 : 0)}%</span>`
          : '';
      h += `<div class="owner">
        <div class="owner-name">${sv(p.nome, 'Proprietário não identificado')}${pct}${docBadge(p.cpf_cnpj)}</div>
        <div class="owner-grid">
          <div><b>CPF / CNPJ</b><span class="mono">${sv(p.cpf_cnpj)}</span></div>
          <div><b>Estado civil</b>${sv(p.estado_civil)}</div>
          <div><b>Regime de bens</b>${sv(p.regime_bens)}</div>
          ${val(p.conjuge) ? `<div><b>Cônjuge</b>${esc(p.conjuge)}</div>` : ''}
        </div></div>`;
    }
  } else {
    h += '<p class="quote">A titularidade não foi identificada na extração. Confira o documento original antes de qualquer decisão.</p>';
  }
  h += '</section>';

  /* 02 · imóvel */
  secs.push({ id: 'imovel', label: 'Imóvel' });
  h += `<section id="sec-imovel">${rubric('02', 'Caracterização do imóvel', val(im.tipo_imovel) ? esc(im.tipo_imovel) : '')}`;
  if (val(im.descricao_detalhada)) h += `<div class="quote meas">${esc(String(im.descricao_detalhada).trim())}</div>`;
  h += `<div class="facts">
    <div class="fact"><label>Endereço</label><div>${sv(im.endereco_completo)}</div></div>
    ${val(im.denominacao) ? `<div class="fact"><label>Denominação</label><div>${esc(im.denominacao)}</div></div>` : ''}
    <div class="fact"><label>Área total</label><div class="num">${Number.isFinite(im.area_total_m2) ? fmtArea(im.area_total_m2) : '—'}</div></div>
    <div class="fact"><label>Área construída</label><div class="num">${Number.isFinite(im.area_construida_m2) && im.area_construida_m2 > 0 ? fmtArea(im.area_construida_m2) : '—'}</div></div>
    <div class="fact"><label>Contribuinte / cadastro</label><div class="mono">${sv(im.numero_contribuinte_iptu)}</div></div>
  </div>`;
  if (val(im.confrontacoes)) h += `<div class="fact fact--wide"><label>Confrontações</label><div class="meas">${esc(im.confrontacoes)}</div></div>`;
  h += '</section>';

  /* 03 · códigos */
  const c = d.codigos_oficiais;
  const gr = d.georreferenciamento;
  const areaGeo = parseNum(gr.area_georreferenciada_ha);
  const perGeo = parseNum(gr.perimetro_m);
  const codes: [string, unknown][] = (
    [
      ['CAR — Cadastro Ambiental Rural', c.car_numero],
      ['Código SIGEF', c.codigo_sigef],
      ['CCIR / INCRA', c.codigo_incra_ccir],
      ['NIRF / ITR', c.nirf_itr],
      ['Código Nacional da Matrícula', c.codigo_nacional_matricula],
      ['Inscrição imobiliária', c.inscricao_imobiliaria],
      ['Datum', gr.datum],
      ['Zona UTM', gr.zona_utm],
      ['Área georreferenciada (ha)', Number.isFinite(areaGeo) ? fmt(areaGeo, 4) : null],
      ['Perímetro (m)', Number.isFinite(perGeo) ? fmt(perGeo) : null],
      ['Responsável técnico', gr.responsavel_tecnico],
      ['ART / TRT', gr.art_trt],
    ] as [string, unknown][]
  ).filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '');
  if (codes.length) {
    secs.push({ id: 'codigos', label: 'Códigos' });
    h += `<section id="sec-codigos">${rubric('03', 'Códigos oficiais e georreferenciamento')}<div class="facts">`;
    for (const [label, v] of codes) h += `<div class="fact"><label>${esc(label)}</label><div><span class="mono">${esc(v)}</span>${copyBtn(v, o.forPrint)}</div></div>`;
    h += '</div></section>';
  }

  /* 04 · ônus */
  secs.push({ id: 'onus', label: 'Ônus' });
  const onus = d.onus_e_gravames;
  const ativos = onus.filter((x) => x.situacao !== 'cancelado');
  h += `<section id="sec-onus">${rubric('04', 'Ônus e gravames', onus.length ? (ativos.length ? `${ativos.length} ativo(s)` : 'todos cancelados') : 'nada extraído')}`;
  if (onus.length) {
    h += '<div class="tablewrap"><table class="dtable"><thead><tr><th>Tipo</th><th>Credor / beneficiário</th><th>Constituição</th><th>Cancelamento</th><th>Valor</th><th>Situação</th></tr></thead><tbody>';
    for (const x of onus) {
      const off = x.situacao === 'cancelado';
      h += `<tr class="${off ? 'off' : ''}">
        <td>${sv(x.tipo)}${val(x.descricao) ? `<br><span class="sub">${esc(x.descricao)}</span>` : ''}</td>
        <td>${sv(x.credor_garantidor)}</td>
        <td class="nowrap mono">${sv(x.ato_constituicao)}</td>
        <td class="nowrap mono">${sv(x.ato_cancelamento)}</td>
        <td class="nowrap num">${fmtMoney(x.valor) ?? '—'}</td>
        <td class="nowrap">${off ? '<span class="chip chip--mute">cancelado</span>' : '<span class="chip chip--bad">ativo</span>'}</td></tr>`;
    }
    h += '</tbody></table></div>';
  } else {
    h += '<p class="quote">Nenhum ônus foi extraído deste documento. Isso não equivale a certidão negativa: confira a matrícula original.</p>';
  }
  h += '</section>';

  /* 05 · atos */
  secs.push({ id: 'atos', label: 'Atos' });
  const atos = [...d.historico_atos].sort((a, b) => {
    const ta = dateValue(a.data_ato);
    const tb = dateValue(b.data_ato);
    if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return ta - tb;
    const na = parseFloat(String(a.identificador ?? '').replace(/\D/g, '')) || 0;
    const nb = parseFloat(String(b.identificador ?? '').replace(/\D/g, '')) || 0;
    return na - nb;
  });
  h += `<section id="sec-atos">${rubric('05', 'Histórico de atos', atos.length ? `${atos.length} ato(s)` : 'nada extraído')}`;
  if (atos.length) {
    h += '<div class="timeline">';
    for (const a of atos) {
      const v = fmtMoney(a.valor_transacao);
      h += `<div class="act ${a.cancelado ? 'off' : ''}">
        <div class="act-head">
          <span class="act-tag">${esc([a.tipo, a.identificador].filter(Boolean).join(' ') || 'Ato')}</span>
          <span class="act-date">${esc(fmtDate(a.data_ato)) || 'sem data'}</span>
          ${v ? `<span class="act-val">${v}</span>` : ''}
          ${a.cancelado ? '<span class="chip chip--mute">cancelado</span>' : ''}
        </div>
        <div class="act-body meas">${sv(a.resumo_fato, 'Sem resumo extraído')}</div>
        ${val(a.efeito) ? `<div class="act-eff">Efeito: ${esc(a.efeito)}</div>` : ''}
      </div>`;
    }
    h += '</div>';
  } else h += '<p class="quote">Nenhum ato foi extraído deste documento.</p>';
  h += '</section>';

  /* 06 · terreno */
  const segs = d.dados_geoespaciais;
  if (segs.length) {
    secs.push({ id: 'terreno', label: 'Terreno' });
    const g = o.summary;
    h += `<section id="sec-terreno">${rubric('06', 'Dados técnicos do terreno', `${segs.length} segmento(s)`)}`;
    if (g) {
      h += `<div class="facts">
        <div class="fact"><label>Área calculada</label><div class="num">${fmtArea(g.area)}</div></div>
        <div class="fact"><label>Perímetro</label><div class="num">${fmt(g.perimeter)} m</div></div>
        <div class="fact"><label>Vértices</label><div class="num">${fmtInt(g.vertices)}</div></div>
        ${g.gap !== null ? `<div class="fact"><label>Erro de fechamento</label><div class="num">${fmt(g.gap, 2)} m</div></div>` : ''}
      </div>`;
    }
    if (o.croqui) h += `<figure class="croqui"><img src="${o.croqui}" alt="Croqui do polígono do terreno"><figcaption>Croqui gerado a partir desta matrícula · norte para cima</figcaption></figure>`;
    const many = segs.length > 14 && !o.forPrint;
    h += '<div class="tablewrap"><table class="dtable"><thead><tr><th>Segmento</th><th>Azimute / rumo</th><th>Distância</th><th>Coordenadas</th><th>Confrontante</th></tr></thead><tbody>';
    segs.forEach((s, i) => {
      const lat = parseCoord(s.coordenada_y);
      const lon = parseCoord(s.coordenada_x);
      const coord =
        Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90
          ? `${fmt(lat, 6)}<br>${fmt(lon, 6)}`
          : Number.isFinite(s.utm_e) && Number.isFinite(s.utm_n)
            ? `E ${fmt(s.utm_e, 2)}<br>N ${fmt(s.utm_n, 2)}`
            : '—';
      const desc = val(s.segmento_descricao) ?? ([s.vertice_origem, s.vertice_destino].filter(Boolean).join(' → ') || `Segmento ${i + 1}`);
      h += `<tr class="${many && i >= 14 ? 'seg-extra' : ''}">
        <td>${esc(desc)}</td><td class="mono nowrap">${sv(s.azimute_rumo)}</td>
        <td class="num nowrap">${Number.isFinite(s.distancia_m) ? fmt(s.distancia_m) + ' m' : '—'}</td>
        <td class="mono small">${coord}</td><td>${sv(s.confrontante)}</td></tr>`;
    });
    h += '</tbody></table></div>';
    if (many) h += `<button type="button" class="btn btn--sm" data-seg-all>Mostrar os ${segs.length} segmentos</button>`;
    h += '</section>';
  }

  /* 07 · pessoas */
  const nomes = d.lista_completa_nomes;
  if (nomes.length) {
    secs.push({ id: 'pessoas', label: 'Pessoas' });
    h += `<section id="sec-pessoas">${rubric('07', 'Índice de pessoas', `${nomes.length} nome(s)`)}<div class="tablewrap"><table class="dtable">
      <thead><tr><th>Nome</th><th>Papel</th><th>Documento</th><th>Citado em</th></tr></thead><tbody>`;
    for (const n of nomes) {
      h += `<tr><td>${sv(n.nome_extraido)}${val(n.tipo_pessoa) ? `<br><span class="sub">${esc(n.tipo_pessoa)}</span>` : ''}</td>
        <td>${sv(n.papel_inferido)}</td>
        <td class="mono nowrap">${sv(n.documento)} ${docBadge(n.documento)}</td>
        <td class="mono nowrap">${sv(n.citado_no_ato)}</td></tr>`;
    }
    h += '</tbody></table></div></section>';
  }

  /* 08 · conferência */
  secs.push({ id: 'verificacao', label: 'Conferência' });
  h += `<section id="sec-verificacao">${rubric('08', 'Conferência automática', 'o app refez as contas que dá para refazer')}<div class="checks">`;
  for (const ck of o.checks) {
    const icon = ck.status === 'ok' ? 'check' : ck.status === 'na' ? 'info' : 'alert';
    h += `<div class="check ${ck.status}"><svg class="ink-icon sm" aria-hidden="true"><use href="#ink-${icon}"/></svg>
      <span><b>${esc(ck.label)}${ck.source === 'ia' ? ' <em>· IA</em>' : ''}</b><span>${esc(ck.detail)}</span></span></div>`;
  }
  h += '</div>';
  const alertas = d.verificacao?.alertas ?? [];
  if (alertas.length) h += `<div class="quote meas"><b>Alertas registrados pela IA:</b><br>${alertas.map((a) => esc(a)).join('<br>')}</div>`;
  if (val(d.observacoes_auditoria)) h += `<div class="quote meas">${esc(d.observacoes_auditoria)}</div>`;
  h += '</section>';

  h += `<footer class="doc-foot">Documento montado em ${(o.now ?? new Date()).toLocaleString('pt-BR')} pelo MatReader a partir de extração automatizada${o.demo ? ' · <b>dados fictícios de demonstração</b>' : ''}.
    Confira sempre a matrícula original: <b>este documento não substitui a certidão de inteiro teor</b> expedida pelo Registro de Imóveis.</footer>`;

  return { html: h, sections: secs };
}
