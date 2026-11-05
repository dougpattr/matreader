import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Action = {
  type: string;
  runAfter: Record<string, string[]>;
  actions?: Record<string, Action>;
  else?: { actions: Record<string, Action> };
  cases?: Record<string, { actions: Record<string, Action> }>;
  default?: { actions: Record<string, Action> };
};
const payload = JSON.parse(readFileSync('power-automate/scope-matreader.template.json', 'utf8'));

describe('integridade do scope gerado', () => {
  it('resolve dependências locais, referências de ações e conexões em todos os caminhos', () => {
    const names = new Set<string>();
    const actions: [string, Action][] = [];
    function visit(group: Record<string, Action>) {
      for (const [name, action] of Object.entries(group)) {
        expect(names.has(name), `ação duplicada: ${name}`).toBe(false);
        names.add(name);
        actions.push([name, action]);
        for (const dependency of Object.keys(action.runAfter)) {
          expect(group, `${name} depende de uma ação fora do bloco`).toHaveProperty(dependency);
        }
        if (action.actions) visit(action.actions);
        if (action.else) visit(action.else.actions);
        if (action.default) visit(action.default.actions);
        for (const branch of Object.values(action.cases ?? {})) visit(branch.actions);
      }
    }
    visit(payload.serializedValue.actions);
    for (const [name, action] of actions) {
      for (const match of JSON.stringify(action).matchAll(/(?:outputs|body|actions)\('([^']+)'\)/g)) {
        expect(names.has(match[1]), `referência inexistente em ${name}: ${match[1]}`).toBe(true);
      }
      if (action.type.startsWith('OpenApiConnection')) expect(payload.allConnectionData).toHaveProperty(name);
    }
  });

  it('responde antes do OCR e grava falhas tanto da leitura quanto do agente', () => {
    const branch = payload.serializedValue.actions.Rota_por_acao.default.actions.Validar_entrada.actions;
    expect(branch.Processar_documento.runAfter).toEqual({ Responder_aceito: ['Succeeded'] });
    expect(branch.Resultado_erro.runAfter).toEqual({ Processar_documento: ['Failed', 'TimedOut'] });
    expect(branch.Gravar_falha.runAfter).toEqual({ Resultado_erro: ['Succeeded'] });
    const process = branch.Processar_documento.actions;
    expect(process.Texto_para_agente.inputs).toContain("['predictionOutput']?['fullText']");
    expect(process.Validar_leitura.else.actions.Gravar_sem_texto.inputs.host.operationId).toBe('UpdateFile');
    expect(process.Validar_leitura.actions.Mensagem_agente.inputs).toContain("outputs('Texto_para_agente')");
  });
});
