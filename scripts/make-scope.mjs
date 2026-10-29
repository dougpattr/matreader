// Gera o scope do Power Automate (formato da área de transferência do
// designer novo) que liga o MatReader ao agente do Copilot Studio.
//
//   npm run scope                        → power-automate/scope-matreader.template.json (com marcadores)
//   npm run scope -- --agente X --ambiente Y --conexao-copilot C [--conexao-onedrive O]
//                                        → power-automate/local/scope-matreader.json (pessoal, fora do git)
//
// Contrato matreader/fluxo@3 — ASSÍNCRONO POR TAREFA. O Power Automate
// encerra a resposta HTTP síncrona em ~2 min e o agente leva mais que isso;
// então o fluxo responde na hora com o número da tarefa, roda o agente em
// segundo plano e guarda o resultado num arquivo do OneDrive, que o app
// consulta pela mesma URL:
//   converter → cria /MatReader/tarefas/<id>.json e responde {status:"processando", tarefa}
//   consultar → devolve o conteúdo do arquivo (processando | concluido | erro)
//   concluir  → apaga o arquivo
//   ping      → responde na hora, sem acionar o agente
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const personal = process.argv.includes('--agente');
const cfg = {
  agente: arg('agente', '{{AGENTE_COPILOT_STUDIO}}'),
  ambiente: arg('ambiente', '{{ID_DO_AMBIENTE}}'),
  conexaoCopilot: arg('conexao-copilot', '{{CONEXAO_COPILOT_STUDIO}}'),
  conexaoOneDrive: arg('conexao-onedrive', 'shared-onedriveforbu-ESCOLHA-SUA-CONEXAO'),
  limite: Number(arg('limite', '60000')),
  pasta: arg('pasta', '/MatReader/tarefas'),
};

const prompt = readFileSync(join(root, 'src', 'domain', 'prompts', 'agente.txt'), 'utf8').trim();
if (prompt.includes('@')) throw new Error('O prompt do agente não pode conter "@" (vira expressão no Power Automate).');

const VERSAO = 'mat-flow/3.0';
const T = "outputs('Texto_recebido')";
const LIM = "outputs('Config_MatReader')?['limite_caracteres']";
const RUN = "workflow()?['run']?['name']";
const TAREFA = "outputs('Tarefa_segura')";
const json = { 'Content-Type': 'application/json; charset=utf-8' };

const response = (statusCode, body, runAfter = {}) => ({ type: 'Response', kind: 'Http', inputs: { statusCode, headers: json, body }, runAfter });

const onedrive = (operationId, parameters, runAfter) => ({
  type: 'OpenApiConnection',
  inputs: {
    parameters,
    host: { apiId: '/providers/Microsoft.PowerApps/apis/shared_onedriveforbusiness', connection: 'shared_onedriveforbusiness', operationId },
  },
  runAfter,
});

/* ---------- caminho "converter" (padrão) ---------- */
const converter = {
  Validar_texto: {
    type: 'If',
    expression: { and: [{ greaterOrEquals: [`@length(${T})`, "@outputs('Config_MatReader')?['minimo_caracteres']"] }] },
    actions: {
      Criar_tarefa: onedrive(
        'CreateFile',
        {
          folderPath: cfg.pasta,
          name: `@{${RUN}}.json`,
          body: `{"ok":true,"status":"processando","tarefa":"@{${RUN}}"}`,
        },
        {},
      ),
      Responder_aceito: response(
        200,
        { ok: true, status: 'processando', tarefa: `@{${RUN}}`, versao: VERSAO, consultar_a_cada_segundos: 5 },
        { Criar_tarefa: ['Succeeded'] },
      ),
      Responder_sem_onedrive: response(
        500,
        {
          ok: false,
          mensagem: 'Não consegui criar a tarefa no OneDrive.',
          detalhe: "@{coalesce(actions('Criar_tarefa')?['error']?['message'], 'confira a conexão do OneDrive for Business no fluxo')}",
          etapa: 'Criar_tarefa',
        },
        { Criar_tarefa: ['Failed', 'TimedOut'] },
      ),
      Prompt_extracao: { type: 'Compose', inputs: prompt, runAfter: { Responder_aceito: ['Succeeded'] } },
      Mensagem_agente: {
        type: 'Compose',
        inputs:
          "@{outputs('Prompt_extracao')}\n\n[METADADOS DO ENVIO]\n" +
          "- arquivo: @{coalesce(triggerBody()?['filename'], 'matricula.pdf')}\n" +
          "- páginas: @{coalesce(triggerBody()?['paginas'], '?')}\n" +
          "- texto obtido por: @{coalesce(triggerBody()?['metodo_texto'], 'desconhecido')}\n" +
          "- confiança média do OCR: @{coalesce(triggerBody()?['ocr_confianca'], 'não se aplica')}\n" +
          `- caracteres enviados: @{min(length(${T}), ${LIM})} de @{length(${T})}` +
          `@{if(greater(length(${T}), ${LIM}), ' (TEXTO CORTADO: registre em alertas que o fim do documento não foi enviado)', '')}\n\n` +
          `TEXTO DA MATRÍCULA:\n<<<INICIO>>>\n@{substring(${T}, 0, min(length(${T}), ${LIM}))}\n<<<FIM>>>`,
        runAfter: { Prompt_extracao: ['Succeeded'] },
      },
      Execute_Agent_and_wait: {
        type: 'OpenApiConnectionWebhook',
        inputs: {
          parameters: { Copilot: cfg.agente, environmentId: cfg.ambiente, 'body/message': "@{outputs('Mensagem_agente')}" },
          host: {
            apiId: '/providers/Microsoft.PowerApps/apis/shared_microsoftcopilotstudio',
            connection: 'shared_microsoftcopilotstudio',
            operationId: 'ExecuteCopilotAsyncV2',
          },
        },
        limit: { timeout: 'PT20M' },
        runAfter: { Mensagem_agente: ['Succeeded'] },
      },
      Resultado_ok: {
        type: 'Compose',
        inputs: {
          ok: true,
          status: 'concluido',
          tarefa: `@{${RUN}}`,
          versao: VERSAO,
          resposta: "@{body('Execute_Agent_and_wait')?['lastResponse']}",
          meta: {
            arquivo: "@{coalesce(triggerBody()?['filename'], 'matricula.pdf')}",
            paginas: "@triggerBody()?['paginas']",
            metodo_texto: "@triggerBody()?['metodo_texto']",
            ocr_confianca: "@triggerBody()?['ocr_confianca']",
            caracteres_recebidos: `@length(${T})`,
            caracteres_enviados: `@min(length(${T}), ${LIM})`,
            truncado: `@greater(length(${T}), ${LIM})`,
            agente: "@{outputs('Config_MatReader')?['agente']}",
            run: `@{${RUN}}`,
          },
        },
        runAfter: { Execute_Agent_and_wait: ['Succeeded'] },
      },
      Gravar_resultado: onedrive('UpdateFile', { id: "@{body('Criar_tarefa')?['Id']}", body: "@{outputs('Resultado_ok')}" }, { Resultado_ok: ['Succeeded'] }),
      Resultado_erro: {
        type: 'Compose',
        inputs: {
          ok: false,
          status: 'erro',
          tarefa: `@{${RUN}}`,
          mensagem: 'O agente não concluiu a extração da matrícula.',
          detalhe: "@{coalesce(actions('Execute_Agent_and_wait')?['error']?['message'], actions('Execute_Agent_and_wait')?['status'], 'sem detalhe')}",
          etapa: 'Execute_Agent_and_wait',
        },
        runAfter: { Execute_Agent_and_wait: ['Failed', 'TimedOut'] },
      },
      Gravar_falha: onedrive('UpdateFile', { id: "@{body('Criar_tarefa')?['Id']}", body: "@{outputs('Resultado_erro')}" }, { Resultado_erro: ['Succeeded'] }),
    },
    else: {
      actions: {
        Responder_texto_insuficiente: response(422, {
          ok: false,
          mensagem: 'Texto insuficiente para extrair a matrícula.',
          detalhe: `@{concat('Recebidos ', string(length(${T})), ' caracteres. Use o MatReader 4 ou mais novo, que extrai o texto do PDF (ou faz OCR) antes de enviar.')}`,
          etapa: 'Validar_texto',
        }),
      },
    },
    runAfter: {},
  },
};

/* ---------- caminho "consultar" ---------- */
const consultar = {
  Ler_tarefa: onedrive('GetFileContentByPath', { path: `${cfg.pasta}/@{${TAREFA}}.json`, inferContentType: true }, {}),
  Responder_tarefa: { type: 'Response', kind: 'Http', inputs: { statusCode: 200, headers: json, body: "@body('Ler_tarefa')" }, runAfter: { Ler_tarefa: ['Succeeded'] } },
  Responder_tarefa_inexistente: response(
    404,
    { ok: false, status: 'erro', mensagem: 'Tarefa não encontrada.', detalhe: `@{concat('A tarefa ', ${TAREFA}, ' não existe — já foi concluída ou foi apagada.')}`, etapa: 'Ler_tarefa' },
    { Ler_tarefa: ['Failed', 'TimedOut'] },
  ),
};

/* ---------- caminho "concluir" ---------- */
const concluir = {
  Localizar_tarefa: onedrive('GetFileMetadataByPath', { path: `${cfg.pasta}/@{${TAREFA}}.json` }, {}),
  Apagar_tarefa: onedrive('DeleteFile', { id: "@{body('Localizar_tarefa')?['Id']}" }, { Localizar_tarefa: ['Succeeded'] }),
  Responder_concluida: response(200, { ok: true, status: 'apagada', tarefa: `@{${TAREFA}}` }, { Apagar_tarefa: ['Succeeded', 'Failed', 'Skipped'] }),
};

const scope = {
  type: 'Scope',
  actions: {
    Config_MatReader: {
      type: 'Compose',
      inputs: { versao: VERSAO, agente: cfg.agente, limite_caracteres: cfg.limite, minimo_caracteres: 200 },
      runAfter: {},
    },
    Texto_recebido: {
      type: 'Compose',
      inputs: "@trim(string(coalesce(triggerBody()?['texto'], '')))",
      runAfter: { Config_MatReader: ['Succeeded'] },
    },
    // só letras e números no nome do arquivo: ninguém usa a URL para ler outros arquivos do OneDrive
    Tarefa_segura: {
      type: 'Compose',
      inputs: "@take(replace(replace(replace(replace(replace(string(coalesce(triggerBody()?['tarefa'], '')), '/', ''), '\\', ''), '.', ''), ':', ''), ' ', ''), 64)",
      runAfter: { Texto_recebido: ['Succeeded'] },
    },
    Rota_por_acao: {
      type: 'Switch',
      expression: "@if(equals(triggerBody()?['ping'], true), 'ping', coalesce(triggerBody()?['acao'], 'converter'))",
      cases: {
        Teste_de_conexao: {
          case: 'ping',
          actions: {
            Responder_teste: response(200, {
              ok: true,
              pong: true,
              versao: VERSAO,
              modo: 'tarefa',
              agente: "@{outputs('Config_MatReader')?['agente']}",
              limite_caracteres: `@${LIM}`,
              recebido_em: "@{formatDateTime(convertTimeZone(utcNow(),'UTC','E. South America Standard Time'),'dd/MM/yyyy HH:mm')}",
            }),
          },
        },
        Consultar_tarefa: { case: 'consultar', actions: consultar },
        Concluir_tarefa: { case: 'concluir', actions: concluir },
      },
      default: { actions: converter },
      runAfter: { Tarefa_segura: ['Succeeded'] },
    },
  },
  runAfter: {},
};

const conn = (api, id, key) => ({
  connectionReference: {
    api: { id: `/providers/Microsoft.PowerApps/apis/${api}` },
    connection: { id: `/providers/Microsoft.PowerApps/apis/${api}/connections/${id}` },
    connectionName: id,
  },
  referenceKey: key,
});
const od = () => conn('shared_onedriveforbusiness', cfg.conexaoOneDrive, 'shared_onedriveforbusiness');

const payload = {
  nodeId: 'Scope_MatReader_Converter_Matricula',
  serializedValue: scope,
  allConnectionData: {
    Execute_Agent_and_wait: conn('shared_microsoftcopilotstudio', cfg.conexaoCopilot, 'shared_microsoftcopilotstudio'),
    Criar_tarefa: od(),
    Gravar_resultado: od(),
    Gravar_falha: od(),
    Ler_tarefa: od(),
    Localizar_tarefa: od(),
    Apagar_tarefa: od(),
  },
  staticResults: {},
  isScopeNode: true,
  mslaNode: true,
};

const outDir = personal ? join(root, 'power-automate', 'local') : join(root, 'power-automate');
const file = join(outDir, personal ? 'scope-matreader.json' : 'scope-matreader.template.json');
mkdirSync(outDir, { recursive: true });
writeFileSync(file, JSON.stringify(payload));
console.log(`[scope] ${personal ? 'scope pessoal' : 'modelo'} gravado em ${file} (${(JSON.stringify(payload).length / 1024).toFixed(1)} KB)`);
