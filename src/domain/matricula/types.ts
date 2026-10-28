/* Forma normalizada de uma matrícula — a única que o resto do app enxerga.
   Números ausentes são NaN (nunca zero inventado); textos ausentes são null. */

export type Txt = string | null;

export interface CabecalhoMatricula {
  numero: Txt;
  cartorio: Txt;
  codigo_cns: Txt;
  comarca: Txt;
  uf: Txt;
  status_matricula: Txt;
  data_abertura: Txt;
}

export interface Imovel {
  endereco_completo: Txt;
  denominacao: Txt;
  tipo_imovel: Txt;
  descricao_detalhada: Txt;
  area_total_m2: number;
  area_construida_m2: number;
  confrontacoes: Txt;
  numero_contribuinte_iptu: Txt;
}

export interface CodigosOficiais {
  car_numero?: Txt;
  codigo_sigef?: Txt;
  codigo_incra_ccir?: Txt;
  nirf_itr?: Txt;
  codigo_nacional_matricula?: Txt;
  inscricao_imobiliaria?: Txt;
  [extra: string]: unknown;
}

export interface Georreferenciamento {
  datum?: Txt;
  zona_utm?: Txt;
  fuso?: Txt;
  area_georreferenciada_ha?: number;
  perimetro_m?: number;
  responsavel_tecnico?: Txt;
  art_trt?: Txt;
  [extra: string]: unknown;
}

export interface Segmento {
  segmento_descricao: Txt;
  vertice_origem: Txt;
  vertice_destino: Txt;
  azimute_rumo: Txt;
  distancia_m: number;
  coordenada_x: unknown;
  coordenada_y: unknown;
  utm_e: number;
  utm_n: number;
  confrontante: Txt;
}

export interface Proprietario {
  nome: Txt;
  cpf_cnpj: Txt;
  participacao_percentual: number | null;
  estado_civil: Txt;
  regime_bens: Txt;
  conjuge: Txt;
}

export type SituacaoOnus = 'ativo' | 'cancelado' | null;

export interface Onus {
  tipo: Txt;
  situacao: SituacaoOnus;
  credor_garantidor: Txt;
  ato_constituicao: Txt;
  ato_cancelamento: Txt;
  valor: number;
  descricao: Txt;
}

export interface Ato {
  identificador: Txt;
  tipo: Txt;
  data_ato: Txt;
  resumo_fato: Txt;
  efeito: Txt;
  valor_transacao: number;
  cancelado: boolean;
}

export interface Pessoa {
  nome_extraido: Txt;
  tipo_pessoa: Txt;
  documento: Txt;
  papel_inferido: Txt;
  citado_no_ato: Txt;
}

export interface ChecagemIA {
  pergunta?: string;
  resultado?: string;
  evidencia?: string;
}

export interface VerificacaoIA {
  vertices_declarados?: number | string | null;
  vertices_extraidos?: number | string | null;
  soma_participacoes?: number | string | null;
  checagens?: ChecagemIA[];
  alertas?: string[];
}

export interface Matricula {
  matricula: CabecalhoMatricula;
  imovel: Imovel;
  codigos_oficiais: CodigosOficiais;
  georreferenciamento: Georreferenciamento;
  dados_geoespaciais: Segmento[];
  proprietarios_atuais: Proprietario[];
  onus_e_gravames: Onus[];
  historico_atos: Ato[];
  lista_completa_nomes: Pessoa[];
  verificacao: VerificacaoIA | null;
  observacoes_auditoria: Txt;
}

/** Ajustes do usuário sobre o polígono — nunca reescrevem a matrícula. */
export interface Fit {
  anchor: string;
  rot: number;
  flipX: boolean;
  flipY: boolean;
  dLat: number;
  dLng: number;
}

export const emptyFit = (): Fit => ({ anchor: '', rot: 0, flipX: false, flipY: false, dLat: 0, dLng: 0 });

export type CheckStatus = 'ok' | 'warn' | 'bad' | 'na';

export interface Check {
  id: string;
  status: CheckStatus;
  label: string;
  detail: string;
  source: 'app' | 'ia';
}

/** Metadados que o fluxo devolve junto da resposta do agente. */
export interface FlowMeta {
  arquivo?: string;
  paginas?: number;
  metodo_texto?: string;
  ocr_confianca?: number | null;
  caracteres_recebidos?: number;
  caracteres_enviados?: number;
  truncado?: boolean;
  duracao_ms?: number;
  versao?: string;
  run?: string;
}
