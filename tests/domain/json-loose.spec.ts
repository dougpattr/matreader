import { describe, expect, it } from 'vitest';
import { extractJson, parseLoose } from '@/domain/matricula/json-loose';

describe('leitor de JSON tolerante', () => {
  it('lê JSON estrito sem consertos', () => {
    const r = parseLoose('{"a":1,"b":[true,null]}');
    expect(r.data).toEqual({ a: 1, b: [true, null] });
    expect(r.repairs).toEqual([]);
    expect(r.truncated).toBe(false);
  });

  it('acha o bloco ```json no meio da conversa', () => {
    const txt = 'Segue o arquivo .JSON abaixo:\n```json\n{"matricula":{"numero":"1"}}\n```\nObrigado!';
    expect(extractJson(txt)).toBe('{"matricula":{"numero":"1"}}');
  });

  it('aceita aspas simples, chave sem aspas, vírgula sobrando e None/True', () => {
    const r = parseLoose("{numero: '42', ativo: True, extra: None, lista: [1,2,],}");
    expect(r.data).toEqual({ numero: '42', ativo: true, extra: null, lista: [1, 2] });
    expect(r.repairs).toEqual(expect.arrayContaining(['chave sem aspas', 'aspas fora do padrão', 'vírgula sobrando']));
  });

  it('mantém aspas soltas dentro do texto (Sítio "São José")', () => {
    const r = parseLoose('{"denominacao": "Sítio "São José" do Vale", "x": 1}');
    expect((r.data as { denominacao: string }).denominacao).toBe("Sítio 'São José' do Vale");
  });

  it('fecha resposta cortada no meio e avisa', () => {
    const r = parseLoose('{"matricula":{"numero":"42.317"},"dados_geoespaciais":[{"azimute_rumo":"90°","distancia_m":300},{"azimute_rumo":"160');
    expect(r.truncated).toBe(true);
    expect(r.repairs).toContain('resposta cortada (fechada automaticamente)');
    const d = r.data as { matricula: { numero: string }; dados_geoespaciais: unknown[] };
    expect(d.matricula.numero).toBe('42.317');
    expect(d.dados_geoespaciais.length).toBeGreaterThanOrEqual(1);
  });

  it('desembrulha JSON entregue como string', () => {
    const r = parseLoose('"{\\"matricula\\":{\\"numero\\":\\"7\\"}}"');
    expect(r.data).toEqual({ matricula: { numero: '7' } });
    expect(r.repairs).toContain('JSON dentro de texto');
  });

  it('aponta linha e coluna quando não dá para ler', () => {
    expect(() => parseLoose('{"a" 1}')).toThrow(/linha 1, coluna/);
  });
});
