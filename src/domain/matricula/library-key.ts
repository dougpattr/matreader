/* Identidade de uma matrícula no acervo: cartório (CNS, nome ou comarca)
   + número. Sem o cartório, matrículas de serventias diferentes com o
   mesmo número se sobrescreveriam. */
import { slug } from '@/core/text';
import type { Matricula } from './types';

export function libraryKey(data: Matricula | null): string | null {
  const m = data?.matricula;
  const num = slug(m?.numero);
  if (!num) return null;
  const org = slug(m?.codigo_cns) || slug(m?.cartorio) || slug(m?.comarca) || 'SEMCARTORIO';
  return `${org}::${num}`;
}

export type LibraryState = 'geo' | 'rascunho' | 'sem';

/** Texto de busca: número, cartório, nomes, documentos e códigos. */
export function searchIndex(d: Matricula): string {
  const m = d.matricula;
  return [
    m.numero,
    m.cartorio,
    m.comarca,
    m.uf,
    d.imovel.denominacao,
    d.imovel.endereco_completo,
    ...d.proprietarios_atuais.flatMap((p) => [p.nome, p.cpf_cnpj]),
    ...d.lista_completa_nomes.map((p) => p.nome_extraido),
    d.codigos_oficiais.car_numero,
    d.codigos_oficiais.codigo_sigef,
    d.codigos_oficiais.codigo_incra_ccir,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
