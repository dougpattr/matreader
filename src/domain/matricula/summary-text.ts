/* Resumo em texto puro — para colar no Teams, no e-mail ou num chamado. */
import { fmt, fmtArea, fmtDate, fmtMoney } from '@/core/format';
import { val } from '@/core/text';
import type { GeoSummary } from '@/domain/geo/geometry';
import { checkStats } from './checks';
import type { Check, Matricula } from './types';

export function summaryText(d: Matricula, g: GeoSummary | null, checks: Check[], now = new Date()): string {
  const m = d.matricula;
  const im = d.imovel;
  const lines: string[] = [];
  const local = [m.comarca, m.uf].filter(Boolean).join('/');
  lines.push(`MATRÍCULA Nº ${m.numero ?? 'S/N'}${m.cartorio ? ` — ${m.cartorio}` : ''}${local ? ` (${local})` : ''}`);
  const imovel = [im.denominacao, im.tipo_imovel].filter(Boolean).join(' · ');
  lines.push(`Situação: ${m.status_matricula ?? 'não informada'}${imovel ? ` · Imóvel: ${imovel}` : ''}`);
  if (val(im.endereco_completo)) lines.push(`Endereço: ${im.endereco_completo}`);
  const area: string[] = [];
  if (Number.isFinite(im.area_total_m2)) area.push(`${fmtArea(im.area_total_m2)} declarados`);
  if (g) area.push(`${fmtArea(g.area)} calculados (${g.vertices} vértices)`);
  if (area.length) lines.push(`Área: ${area.join(' · ')}`);
  if (d.proprietarios_atuais.length) {
    lines.push(
      `Proprietários: ${d.proprietarios_atuais
        .map((p) => `${p.nome ?? '—'}${p.participacao_percentual !== null && Number.isFinite(p.participacao_percentual) ? ` (${fmt(p.participacao_percentual, p.participacao_percentual % 1 ? 2 : 0)}%)` : ''}`)
        .join(' · ')}`,
    );
  }
  const ativos = d.onus_e_gravames.filter((o) => o.situacao !== 'cancelado');
  lines.push(
    ativos.length
      ? `Ônus ativos: ${ativos.map((o) => [o.tipo, o.credor_garantidor, o.ato_constituicao && `(${o.ato_constituicao})`, fmtMoney(o.valor)].filter(Boolean).join(' — ')).join(' · ')}`
      : `Ônus ativos: nenhum${d.onus_e_gravames.length ? ' (todos cancelados)' : ' extraído'}`,
  );
  const ultimo = [...d.historico_atos].reverse().find((a) => a.data_ato);
  if (ultimo) lines.push(`Último ato: ${[ultimo.identificador, fmtDate(ultimo.data_ato), ultimo.resumo_fato].filter(Boolean).join(' — ')}`);
  const c = d.codigos_oficiais;
  const codes = [c.car_numero && `CAR ${c.car_numero}`, c.codigo_sigef && `SIGEF ${c.codigo_sigef}`, c.codigo_incra_ccir && `CCIR ${c.codigo_incra_ccir}`].filter(Boolean);
  if (codes.length) lines.push(`Códigos: ${codes.join(' · ')}`);
  const st = checkStats(checks);
  lines.push(`Conferências: ${st.ok} de ${st.total} ok${st.problems.length ? ` · Atenção: ${st.problems.map((p) => p.label).join('; ')}` : ''}`);
  lines.push('');
  lines.push(`Gerado pelo MatReader em ${now.toLocaleString('pt-BR')} a partir de extração automatizada — confira a certidão original.`);
  return lines.join('\n');
}
