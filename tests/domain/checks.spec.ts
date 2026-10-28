import { describe, expect, it } from 'vitest';
import { buildGeometry, geoLatLngs, geoSummary } from '@/domain/geo/geometry';
import { runChecks } from '@/domain/matricula/checks';
import { DEMO_MATRICULA } from '@/domain/matricula/demo';
import { docStatus, validaCNPJ, validaCPF } from '@/domain/matricula/documents';
import { libraryKey } from '@/domain/matricula/library-key';
import { normalize } from '@/domain/matricula/normalize';
import { summaryText } from '@/domain/matricula/summary-text';
import { emptyFit } from '@/domain/matricula/types';
import { cleanText } from '@/services/extract/clean-text';

describe('documentos', () => {
  it('confere CPF e CNPJ pelo dígito', () => {
    expect(validaCPF('529.982.247-25')).toBe(true);
    expect(validaCPF('123.456.789-00')).toBe(false);
    expect(validaCNPJ('11.222.333/0001-81')).toBe(true);
    expect(docStatus('CREA-SP 0000000000')).toBe('na');
  });
});

describe('normalização', () => {
  it('aceita sinônimos de campo e frações', () => {
    const d = normalize({ registro: { matricula: '9' }, titulares: [{ razao_social: 'X LTDA', fracao_ideal: '1/3' }], atos: [{ numero: 'R.1', esta_cancelado: 'sim' }] });
    expect(d.matricula.numero).toBe('9');
    expect(d.proprietarios_atuais[0]!.nome).toBe('X LTDA');
    expect(d.proprietarios_atuais[0]!.participacao_percentual).toBeCloseTo(33.33, 2);
    expect(d.historico_atos[0]!.cancelado).toBe(true);
  });

  it('acha a matrícula dentro de um envelope', () => {
    const d = normalize({ resultado: { matricula: { numero: '77' }, imovel: {} } });
    expect(d.matricula.numero).toBe('77');
  });

  it('chave do acervo usa cartório + número', () => {
    expect(libraryKey(normalize(DEMO_MATRICULA))).toBe('123456::42317');
  });
});

describe('conferência automática do exemplo', () => {
  const data = normalize(DEMO_MATRICULA);
  const geo = buildGeometry(data);
  const fit = { ...emptyFit(), anchor: '-22.7, -47.3' };
  const summary = geoSummary(geo, fit);
  const checks = runChecks(data, { geo, summary, latLngs: geoLatLngs(geo, fit) });
  const byId = Object.fromEntries(checks.map((c) => [c.id, c]));

  it('acha o CPF com dígito errado e o ônus ativo', () => {
    expect(byId.documentos!.status).toBe('warn');
    expect(byId.documentos!.detail).toContain('123.456.789-00');
    expect(byId.onus!.status).toBe('warn');
  });

  it('participações fecham 100% e o polígono fecha sem cruzar', () => {
    expect(byId.participacoes!.status).toBe('ok');
    expect(byId.fechamento!.status).toBe('ok');
    expect(byId.autointersecao!.status).toBe('ok');
    expect(byId.brasil!.status).toBe('ok');
  });

  it('marca resposta cortada e texto truncado quando informados', () => {
    const c = runChecks(data, { geo, summary, latLngs: null, truncatedResponse: true, meta: { truncado: true, caracteres_enviados: 100, caracteres_recebidos: 200 } });
    expect(c.find((x) => x.id === 'resposta-cortada')!.status).toBe('bad');
    expect(c.find((x) => x.id === 'texto-truncado')!.status).toBe('warn');
  });

  it('gera resumo em texto para colar no Teams', () => {
    const t = summaryText(data, summary, checks, new Date('2026-10-28T10:00:00Z'));
    expect(t).toContain('MATRÍCULA Nº 42.317');
    expect(t).toContain('Alienação fiduciária');
  });
});

describe('limpeza do texto', () => {
  it('remove moldura repetida e número de página, mantém a 1ª ocorrência e junta hifenização', () => {
    const body = (n: number) => Array.from({ length: 8 }, (_, i) => `Linha ${i} do corpo da folha ${n} com texto próprio ${'x'.repeat(n + i)}`).join('\n');
    const pages = [1, 2, 3, 4].map(
      (n) => `MATRÍCULA Nº 42.317 — FICHA ${n}\nCERTIDÃO DIGITAL - SELO ABC${n}\n${body(n)}\nTexto da pá-\ngina ${n} termina aqui\n${n}/4`,
    );
    const r = cleanText(pages);
    expect(r.text).toContain('=== Página 1 ===');
    expect(r.text).toContain('Texto da página 1 termina aqui');
    expect(r.text.match(/MATRÍCULA Nº 42\.317/g)).toHaveLength(1);
    expect(r.text.match(/CERTIDÃO DIGITAL/g)).toHaveLength(1);
    expect(r.text).not.toMatch(/\d\/4/);
    expect(r.removedLines).toBeGreaterThanOrEqual(10);
  });
});
