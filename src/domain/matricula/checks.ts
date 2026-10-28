/* Conferência automática — o CoVe do lado do app.
   A IA pode errar em silêncio. Aqui o próprio app refaz as contas que
   dão para refazer e mostra, com evidência, o que não fecha. */
import { dateValue, fmt, fmtInt, parseNum } from '@/core/format';
import { normName, onlyDigits, plural, val } from '@/core/text';
import { insideBrazil } from '@/domain/geo/angles';
import type { Geometry, GeoSummary } from '@/domain/geo/geometry';
import { docStatus } from './documents';
import type { Check, CheckStatus, FlowMeta, Matricula } from './types';

export interface CheckContext {
  geo: Geometry | null;
  summary: GeoSummary | null;
  latLngs: [number, number][] | null;
  /** metadados do fluxo (texto truncado, OCR) — só na conversão por IA */
  meta?: FlowMeta | null;
  /** a resposta da IA veio cortada e foi fechada pelo leitor tolerante */
  truncatedResponse?: boolean;
  now?: number;
}

export function runChecks(data: Matricula | null, ctx: CheckContext): Check[] {
  const out: Check[] = [];
  if (!data) return out;
  const add = (id: string, status: CheckStatus, label: string, detail: string, source: Check['source'] = 'app') =>
    out.push({ id, status, label, detail, source });
  const m = data.matricula;
  const im = data.imovel;

  if (ctx.truncatedResponse) {
    add('resposta-cortada', 'bad', 'Resposta completa da IA',
      'a resposta veio cortada e foi fechada automaticamente — os últimos itens podem faltar; converta de novo ou use o prompt compacto');
  }
  if (ctx.meta?.truncado) {
    add('texto-truncado', 'warn', 'Texto inteiro enviado à IA',
      `a IA leu ${fmtInt(ctx.meta.caracteres_enviados ?? NaN)} de ${fmtInt(ctx.meta.caracteres_recebidos ?? NaN)} caracteres — o fim do documento ficou de fora`);
  }
  const conf = ctx.meta?.ocr_confianca;
  if (typeof conf === 'number' && Number.isFinite(conf)) {
    add('ocr', conf >= 70 ? 'ok' : 'warn', 'Leitura por OCR',
      conf >= 70 ? `confiança média de ${fmt(conf, 0)}%` : `confiança média de ${fmt(conf, 0)}% — confira nomes, números e azimutes no original`);
  }

  add('numero', val(m.numero) ? 'ok' : 'bad', 'Número da matrícula',
    val(m.numero) ? `Matrícula ${m.numero}${val(m.cartorio) ? ' · ' + m.cartorio : ''}` : 'não foi extraído — sem ele a matrícula não é salva com segurança');

  const st = String(m.status_matricula ?? '').toLowerCase();
  if (!val(m.status_matricula)) add('situacao', 'warn', 'Situação da matrícula', 'o documento não informou (o app não presume "ativa")');
  else if (/encerr|cancel|transport/.test(st)) add('situacao', 'bad', 'Situação da matrícula', `${m.status_matricula} — confira a matrícula sucessora antes de usar estes dados`);
  else add('situacao', 'ok', 'Situação da matrícula', String(m.status_matricula));

  const donos = data.proprietarios_atuais;
  add('titularidade', donos.length ? 'ok' : 'warn', 'Titularidade atual',
    donos.length ? donos.map((d) => d.nome ?? 'sem nome').join(' · ') : 'nenhum proprietário identificado');

  const pcts = donos.map((d) => d.participacao_percentual).filter((p): p is number => p !== null && Number.isFinite(p));
  if (donos.length && pcts.length === donos.length) {
    const soma = pcts.reduce((a, b) => a + b, 0);
    const okSoma = Math.abs(soma - 100) <= 0.5;
    add('participacoes', okSoma ? 'ok' : 'warn', 'Soma das participações', `${fmt(soma, 2)}%${okSoma ? '' : ' — deveria fechar 100%'}`);
  } else add('participacoes', 'na', 'Soma das participações', 'nem todos os proprietários têm percentual informado');

  const docs = [
    ...donos.map((d) => ({ n: d.nome, d: d.cpf_cnpj })),
    ...data.lista_completa_nomes.map((p) => ({ n: p.nome_extraido, d: p.documento })),
  ].filter((x) => x.d && [11, 14].includes(onlyDigits(x.d).length));
  const ruins = docs.filter((x) => docStatus(x.d) === 'bad');
  if (docs.length) {
    add('documentos', ruins.length ? 'warn' : 'ok', 'CPF/CNPJ conferidos pelo dígito',
      ruins.length
        ? `${ruins.length} de ${docs.length} não batem: ${ruins.slice(0, 3).map((x) => x.d).join(', ')}`
        : `${plural(docs.length, 'documento', 'documentos')} com dígito verificador correto`);
  } else add('documentos', 'na', 'CPF/CNPJ', 'nenhum documento foi extraído');

  // mesmo CPF/CNPJ com nomes diferentes costuma ser erro de transcrição
  const porDoc = new Map<string, Set<string>>();
  docs.forEach((x) => {
    const k = onlyDigits(x.d);
    const nome = normName(x.n);
    if (!nome) return;
    if (!porDoc.has(k)) porDoc.set(k, new Set());
    porDoc.get(k)!.add(nome);
  });
  const conflitos = [...porDoc.entries()].filter(([, nomes]) => nomes.size > 1);
  if (conflitos.length) {
    add('doc-nomes', 'warn', 'Um documento, um nome',
      conflitos.slice(0, 2).map(([d, nomes]) => `${d}: ${[...nomes].join(' / ')}`).join(' · '));
  }

  const onus = data.onus_e_gravames;
  const ativos = onus.filter((o) => o.situacao !== 'cancelado');
  add('onus', ativos.length ? 'warn' : onus.length ? 'ok' : 'na', 'Ônus e gravames',
    ativos.length
      ? `${ativos.length} ativo(s): ${ativos.map((o) => o.tipo ?? 'ônus').join(', ')}`
      : onus.length ? 'todos os ônus listados estão cancelados' : 'nenhum ônus foi extraído deste documento');

  // ônus ativo cujo ato de origem aparece cancelado no histórico
  const cancelados = new Set(data.historico_atos.filter((a) => a.cancelado).map((a) => String(a.identificador ?? '').toUpperCase()));
  const incoerentes = ativos.filter((o) => o.ato_constituicao && cancelados.has(String(o.ato_constituicao).toUpperCase()));
  if (incoerentes.length) {
    add('onus-coerencia', 'warn', 'Coerência dos ônus',
      `${incoerentes.length} ônus segue como ativo, mas o ato que o constituiu (${incoerentes.map((o) => o.ato_constituicao).join(', ')}) consta cancelado`);
  }

  const atos = data.historico_atos.filter((a) => a.data_ato);
  if (atos.length > 1) {
    const ord = atos.map((a) => dateValue(a.data_ato)).filter((t) => Number.isFinite(t));
    let fora = 0;
    for (let i = 1; i < ord.length; i++) if (ord[i]! < ord[i - 1]!) fora++;
    add('cronologia', fora ? 'warn' : 'ok', 'Cronologia dos atos',
      fora ? `${fora} ato(s) com data anterior ao ato precedente — confira a numeração` : `${ord.length} atos em ordem coerente`);
    const now = ctx.now ?? Date.now();
    const futuros = atos.filter((a) => dateValue(a.data_ato) > now + 86400000);
    if (futuros.length) add('datas-futuras', 'warn', 'Datas no futuro', `${futuros.map((a) => a.identificador ?? 'ato').join(', ')} com data posterior a hoje`);
  } else add('cronologia', 'na', 'Cronologia dos atos', 'menos de dois atos com data');

  const g = ctx.summary;
  if (g) {
    add('fechamento', g.closes ? 'ok' : 'bad', 'Fechamento do polígono',
      g.gap === null ? 'coordenadas próprias (não se aplica erro de fechamento)' : `erro de ${fmt(g.gap, 2)} m para uma tolerância de ${fmt(g.tol, 2)} m`);
    add('autointersecao', g.selfIntersections ? 'bad' : 'ok', 'Contorno sem cruzamentos',
      g.selfIntersections
        ? `o contorno se cruza ${plural(g.selfIntersections, 'vez', 'vezes')} — algum azimute ou distância foi transcrito errado`
        : 'nenhum lado cruza outro');
    if (ctx.geo && ctx.geo.skipped > 0) {
      add('lances', 'warn', 'Lances legíveis', `${plural(ctx.geo.skipped, 'lance ficou', 'lances ficaram')} de fora por falta de azimute ou distância legível`);
    }
    if (g.duplicates) add('duplicados', 'warn', 'Vértices repetidos', `${plural(g.duplicates, 'vértice coincide', 'vértices coincidem')} com o anterior`);

    const dec = parseNum(im.area_total_m2);
    if (Number.isFinite(dec) && dec > 0) {
      const dif = (Math.abs(g.area - dec) / dec) * 100;
      add('area', dif <= 5 ? 'ok' : 'warn', 'Área calculada × declarada',
        `${fmt(g.area)} m² calculados contra ${fmt(dec)} m² declarados — diferença de ${fmt(dif, 1)}%`);
    } else add('area', 'na', 'Área calculada × declarada', 'a matrícula não declarou área total');

    const gr = data.georreferenciamento;
    const areaGeo = parseNum(gr.area_georreferenciada_ha);
    if (Number.isFinite(areaGeo) && areaGeo > 0) {
      const dif = (Math.abs(g.area / 10000 - areaGeo) / areaGeo) * 100;
      add('area-georref', dif <= 1 ? 'ok' : 'warn', 'Área georreferenciada × calculada',
        `${fmt(areaGeo, 4)} ha certificados contra ${fmt(g.area / 10000, 4)} ha calculados — ${fmt(dif, 2)}%`);
    }
    const perDec = parseNum(gr.perimetro_m);
    if (Number.isFinite(perDec) && perDec > 0) {
      const dif = (Math.abs(g.perimeter - perDec) / perDec) * 100;
      add('perimetro', dif <= 1 ? 'ok' : 'warn', 'Perímetro declarado × calculado',
        `${fmt(perDec)} m declarados contra ${fmt(g.perimeter)} m calculados — ${fmt(dif, 2)}%`);
    }

    add('posicao', g.located ? 'ok' : 'warn', 'Posição no mapa',
      g.located ? 'polígono georreferenciado' : 'falta tocar no mapa para posicionar o vértice inicial');
    const lls = ctx.latLngs;
    if (lls) {
      const fora = lls.filter(([lat, lon]) => !insideBrazil(lat, lon)).length;
      add('brasil', fora ? 'warn' : 'ok', 'Coordenadas dentro do Brasil',
        fora ? `${fora} de ${lls.length} vértice(s) fora dos limites do país — confira a zona UTM e o hemisfério` : `${lls.length} vértices dentro dos limites do país`);
    }
    const declaradosIA = parseNum(data.verificacao?.vertices_declarados);
    if (Number.isFinite(declaradosIA)) {
      add('vertices', Math.abs(declaradosIA - g.vertices) <= 1 ? 'ok' : 'bad', 'Vértices declarados × extraídos',
        `${fmtInt(declaradosIA)} declarados no memorial, ${fmtInt(g.vertices)} extraídos`);
    }
  } else {
    add('geometria', 'na', 'Geometria do terreno', 'esta matrícula não trouxe azimutes nem coordenadas');
  }

  // checagens que a própria IA registrou (CoVe do prompt)
  (data.verificacao?.checagens ?? []).forEach((c, i) => {
    const r = String(c.resultado ?? '').toLowerCase();
    add(`ia-${i}`, r.startsWith('ok') ? 'ok' : r.startsWith('diver') ? 'warn' : 'na', c.pergunta ?? 'Checagem da IA', c.evidencia ?? c.resultado ?? '', 'ia');
  });
  return out;
}

export function checkStats(checks: Check[]) {
  const ok = checks.filter((c) => c.status === 'ok').length;
  const total = checks.filter((c) => c.status !== 'na').length;
  const problems = checks.filter((c) => c.status === 'warn' || c.status === 'bad');
  const bad = checks.filter((c) => c.status === 'bad').length;
  return { ok, total, problems, bad, pct: total ? Math.round((ok / total) * 100) : 0 };
}
