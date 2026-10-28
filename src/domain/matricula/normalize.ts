/* Normalização: aceita as variações de nome que as IAs usam e devolve
   sempre a mesma forma (types.ts) para o resto do app. */
import { parseNum, parsePct } from '@/core/format';
import { val } from '@/core/text';
import type { Ato, Matricula, Onus, Pessoa, Proprietario, Segmento, Txt } from './types';

type Obj = Record<string, unknown>;

const isObj = (o: unknown): o is Obj => !!o && typeof o === 'object' && !Array.isArray(o);

function pick(obj: unknown, ...keys: string[]): unknown {
  if (!isObj(obj)) return null;
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
}

function txt(obj: unknown, ...keys: string[]): Txt {
  const v = pick(obj, ...keys);
  if (v === null) return null;
  if (typeof v === 'object') return null;
  return val(String(v).trim());
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : v ? [v] : [];
}

function boolish(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (v === null || v === undefined) return false;
  const s = String(v).trim().toLowerCase();
  return s === 'true' || s === 'sim' || s === '1' || s === 'cancelado';
}

/** Parece uma matrícula: tem um dos blocos-objeto ou uma das listas
 *  características (com os sinônimos que as IAs usam). */
export function isMatricula(o: unknown): o is Obj {
  if (!isObj(o)) return false;
  const obj = (k: string) => isObj(o[k]);
  const list = (k: string) => Array.isArray(o[k]) && (o[k] as unknown[]).length > 0;
  return (
    obj('matricula') || obj('registro') || obj('imovel') || obj('bem') ||
    list('dados_geoespaciais') || list('proprietarios_atuais') || list('titulares') ||
    list('historico_atos') || list('atos')
  );
}

/** Encontra a matrícula dentro de envelopes comuns ({resultado:{…}},
 *  [{…}], {matricula_json:{…}}) — até dois níveis de profundidade. */
export function findMatricula(input: unknown): Obj | null {
  if (isMatricula(input)) return input;
  if (Array.isArray(input)) {
    for (const item of input) {
      const m = findMatricula(item);
      if (m) return m;
    }
    return null;
  }
  if (isObj(input)) {
    for (const v of Object.values(input)) {
      if (isMatricula(v)) return v;
    }
    for (const v of Object.values(input)) {
      if (isObj(v) || Array.isArray(v)) {
        for (const w of Object.values(v as Obj)) if (isMatricula(w)) return w as Obj;
      }
    }
  }
  return null;
}

export function normalize(input: unknown): Matricula {
  const src: Obj = findMatricula(input) ?? (isObj(input) ? input : {});
  const m = (pick(src, 'matricula', 'registro') ?? {}) as Obj;
  const im = (pick(src, 'imovel', 'bem') ?? {}) as Obj;

  const out: Matricula = {
    matricula: {
      numero: txt(m, 'numero', 'matricula', 'n_matricula'),
      cartorio: txt(m, 'cartorio', 'serventia', 'oficio'),
      codigo_cns: txt(m, 'codigo_cns', 'cns'),
      comarca: txt(m, 'comarca', 'municipio'),
      uf: txt(m, 'uf', 'estado'),
      status_matricula: txt(m, 'status_matricula', 'status', 'situacao'),
      data_abertura: txt(m, 'data_abertura', 'data'),
    },
    imovel: {
      endereco_completo: txt(im, 'endereco_completo', 'endereco', 'localizacao'),
      denominacao: txt(im, 'denominacao', 'nome', 'designacao'),
      tipo_imovel: txt(im, 'tipo_imovel', 'tipo'),
      descricao_detalhada: txt(im, 'descricao_detalhada', 'descricao', 'memorial'),
      area_total_m2: parseNum(pick(im, 'area_total_m2', 'area_total', 'area')),
      area_construida_m2: parseNum(pick(im, 'area_construida_m2', 'area_construida')),
      confrontacoes: txt(im, 'confrontacoes', 'confrontantes', 'limites'),
      numero_contribuinte_iptu: txt(im, 'numero_contribuinte_iptu', 'contribuinte', 'inscricao_municipal'),
    },
    codigos_oficiais: isObj(src.codigos_oficiais) ? { ...src.codigos_oficiais } : {},
    georreferenciamento: isObj(src.georreferenciamento) ? { ...src.georreferenciamento } : {},
    dados_geoespaciais: arr(src.dados_geoespaciais ?? src.geo ?? src.vertices).map(
      (g): Segmento => ({
        segmento_descricao: txt(g, 'segmento_descricao', 'segmento', 'descricao'),
        vertice_origem: txt(g, 'vertice_origem', 'vertice', 'ponto', 'de'),
        vertice_destino: txt(g, 'vertice_destino', 'para'),
        azimute_rumo: txt(g, 'azimute_rumo', 'azimute', 'rumo'),
        distancia_m: parseNum(pick(g, 'distancia_m', 'distancia')),
        coordenada_x: pick(g, 'coordenada_x', 'longitude', 'lon', 'long'),
        coordenada_y: pick(g, 'coordenada_y', 'latitude', 'lat'),
        utm_e: parseNum(pick(g, 'utm_e', 'este', 'e', 'easting')),
        utm_n: parseNum(pick(g, 'utm_n', 'norte', 'n', 'northing')),
        confrontante: txt(g, 'confrontante', 'confrontacao'),
      }),
    ),
    proprietarios_atuais: arr(src.proprietarios_atuais ?? src.proprietario_atual ?? src.titulares).map(
      (p): Proprietario => ({
        nome: txt(p, 'nome', 'nome_completo', 'razao_social'),
        cpf_cnpj: txt(p, 'cpf_cnpj', 'documento', 'cpf', 'cnpj'),
        participacao_percentual: parsePct(pick(p, 'participacao_percentual', 'participacao', 'fracao_ideal')),
        estado_civil: txt(p, 'estado_civil'),
        regime_bens: txt(p, 'regime_bens', 'regime_de_bens'),
        conjuge: txt(p, 'conjuge', 'conjugue', 'esposo', 'esposa'),
      }),
    ),
    onus_e_gravames: arr(src.onus_e_gravames ?? src.onus).map((o): Onus => {
      const sit = String(pick(o, 'situacao', 'status') ?? '').toLowerCase();
      return {
        tipo: txt(o, 'tipo', 'especie'),
        situacao: sit.includes('cancel') || sit.includes('baixa') ? 'cancelado' : sit ? 'ativo' : null,
        credor_garantidor: txt(o, 'credor_garantidor', 'credor', 'beneficiario'),
        ato_constituicao: txt(o, 'ato_constituicao', 'ato', 'registro'),
        ato_cancelamento: txt(o, 'ato_cancelamento', 'cancelamento'),
        valor: parseNum(pick(o, 'valor', 'valor_divida')),
        descricao: txt(o, 'descricao', 'observacao'),
      };
    }),
    historico_atos: arr(src.historico_atos ?? src.atos).map(
      (a): Ato => ({
        identificador: txt(a, 'identificador', 'numero', 'ato'),
        tipo: txt(a, 'tipo'),
        data_ato: txt(a, 'data_ato', 'data'),
        resumo_fato: txt(a, 'resumo_fato', 'resumo', 'descricao'),
        efeito: txt(a, 'efeito'),
        valor_transacao: parseNum(pick(a, 'valor_transacao', 'valor')),
        cancelado: boolish(pick(a, 'cancelado', 'esta_cancelado')),
      }),
    ),
    lista_completa_nomes: arr(src.lista_completa_nomes ?? src.pessoas).map(
      (n): Pessoa => ({
        nome_extraido: txt(n, 'nome_extraido', 'nome'),
        tipo_pessoa: txt(n, 'tipo_pessoa', 'tipo'),
        documento: txt(n, 'documento', 'cpf_cnpj', 'cpf', 'cnpj'),
        papel_inferido: txt(n, 'papel_inferido', 'papel', 'funcao'),
        citado_no_ato: txt(n, 'citado_no_ato', 'ato'),
      }),
    ),
    verificacao: isObj(src.verificacao) ? (src.verificacao as Matricula['verificacao']) : null,
    observacoes_auditoria: txt(src, 'observacoes_auditoria', 'observacoes', 'notas'),
  };

  const g = out.georreferenciamento;
  for (const k of ['area_georreferenciada_ha', 'perimetro_m'] as const) {
    if (g[k] !== undefined && g[k] !== null) g[k] = parseNum(g[k]);
  }
  return out;
}
