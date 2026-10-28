// Gera o scope do Power Automate (formato da área de transferência do
// designer novo) que liga o MatReader ao agente do Copilot Studio.
//
//   npm run scope                        → power-automate/scope-matreader.template.json (com marcadores)
//   npm run scope -- --agente X --ambiente Y --email Z --conexao-copilot C --conexao-teams T
//                                        → power-automate/local/scope-matreader.json (pessoal, fora do git)
//
// O fluxo: gatilho "Quando uma solicitação HTTP é recebida" (POST, Qualquer
// pessoa) e, abaixo dele, este scope. Contrato matreader/fluxo@2.
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
  email: arg('email', '{{SEU_EMAIL_NO_TEAMS}}'),
  conexaoCopilot: arg('conexao-copilot', '{{CONEXAO_COPILOT_STUDIO}}'),
  conexaoTeams: arg('conexao-teams', '{{CONEXAO_TEAMS}}'),
  limite: Number(arg('limite', '60000')),
};

const prompt = readFileSync(join(root, 'src', 'domain', 'prompts', 'agente.txt'), 'utf8').trim();
if (prompt.includes('@')) throw new Error('O prompt do agente não pode conter "@" (vira expressão no Power Automate).');

const T = "outputs('Texto_recebido')";
const LIM = "outputs('Config_MatReader')?['limite_caracteres']";
const AG = "body('Execute_Agent_and_wait')";
const HOJE = "formatDateTime(convertTimeZone(utcNow(),'UTC','E. South America Standard Time'),'dd/MM/yyyy HH:mm')";
const json = { 'Content-Type': 'application/json; charset=utf-8' };

const teams = (after, html) => ({
  type: 'OpenApiConnection',
  inputs: {
    parameters: {
      poster: 'Flow bot',
      location: 'Chat with Flow bot',
      'body/recipient': cfg.email,
      'body/messageBody': html,
    },
    host: { apiId: '/providers/Microsoft.PowerApps/apis/shared_teams', connection: 'shared_teams-1', operationId: 'PostMessageToConversation' },
  },
  runAfter: after,
});

const scope = {
  type: 'Scope',
  actions: {
    Config_MatReader: {
      type: 'Compose',
      inputs: { versao: 'mat-flow/2.0', agente: cfg.agente, limite_caracteres: cfg.limite, minimo_caracteres: 200 },
      runAfter: {},
    },
    Texto_recebido: {
      type: 'Compose',
      inputs: "@trim(string(coalesce(triggerBody()?['texto'], '')))",
      runAfter: { Config_MatReader: ['Succeeded'] },
    },
    Rota_teste_ou_conversao: {
      type: 'If',
      expression: { and: [{ equals: ["@triggerBody()?['ping']", true] }] },
      actions: {
        Responder_teste: {
          type: 'Response',
          kind: 'Http',
          inputs: {
            statusCode: 200,
            headers: json,
            body: {
              ok: true,
              pong: true,
              versao: "@{outputs('Config_MatReader')?['versao']}",
              agente: "@{outputs('Config_MatReader')?['agente']}",
              limite_caracteres: `@${LIM}`,
              recebido_em: `@{${HOJE}}`,
            },
          },
          runAfter: {},
        },
      },
      else: {
        actions: {
          Validar_texto: {
            type: 'If',
            expression: { and: [{ greaterOrEquals: [`@length(${T})`, "@outputs('Config_MatReader')?['minimo_caracteres']"] }] },
            actions: {
              Prompt_extracao: { type: 'Compose', inputs: prompt, runAfter: {} },
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
                limit: { timeout: 'PT10M' },
                runAfter: { Mensagem_agente: ['Succeeded'] },
              },
              Responder_sucesso: {
                type: 'Response',
                kind: 'Http',
                inputs: {
                  statusCode: 200,
                  headers: json,
                  body: {
                    ok: true,
                    versao: "@{outputs('Config_MatReader')?['versao']}",
                    resposta: `@{${AG}?['lastResponse']}`,
                    meta: {
                      arquivo: "@{coalesce(triggerBody()?['filename'], 'matricula.pdf')}",
                      paginas: "@triggerBody()?['paginas']",
                      metodo_texto: "@triggerBody()?['metodo_texto']",
                      ocr_confianca: "@triggerBody()?['ocr_confianca']",
                      caracteres_recebidos: `@length(${T})`,
                      caracteres_enviados: `@min(length(${T}), ${LIM})`,
                      truncado: `@greater(length(${T}), ${LIM})`,
                      agente: "@{outputs('Config_MatReader')?['agente']}",
                      run: "@{workflow()?['run']?['name']}",
                    },
                  },
                },
                runAfter: { Execute_Agent_and_wait: ['Succeeded'] },
              },
              Responder_falha_agente: {
                type: 'Response',
                kind: 'Http',
                inputs: {
                  statusCode: "@if(equals(actions('Execute_Agent_and_wait')?['status'], 'TimedOut'), 504, 502)",
                  headers: json,
                  body: {
                    ok: false,
                    mensagem: 'O agente não concluiu a extração da matrícula.',
                    detalhe: "@{coalesce(actions('Execute_Agent_and_wait')?['error']?['message'], actions('Execute_Agent_and_wait')?['status'], 'sem detalhe')}",
                    etapa: 'Execute_Agent_and_wait',
                  },
                },
                runAfter: { Execute_Agent_and_wait: ['Failed', 'TimedOut'] },
              },
              Avisar_no_Teams_resultado: teams(
                { Responder_sucesso: ['Failed', 'TimedOut'] },
                `@{concat('<h2>Matrícula convertida — o app já tinha parado de esperar</h2><p>O Power Automate encerra a resposta HTTP em cerca de 2 minutos, mas o agente terminou. Copie o JSON abaixo e use <b>Colar JSON</b> no MatReader.</p><p><b>Arquivo:</b> ', coalesce(triggerBody()?['filename'], '-'), ' · <b>Data:</b> ', ${HOJE}, '</p><pre>', replace(replace(coalesce(${AG}?['lastResponse'], ''), '<', '&lt;'), '>', '&gt;'), '</pre>')}`,
              ),
              Avisar_no_Teams_falha: teams(
                { Responder_falha_agente: ['Failed', 'TimedOut'] },
                `@{concat('<h2>Falha na conversão da matrícula</h2><p>O agente não concluiu e o app não recebeu o aviso.</p><p><b>Arquivo:</b> ', coalesce(triggerBody()?['filename'], '-'), ' · <b>Data:</b> ', ${HOJE}, '</p><p><b>Detalhe:</b> ', coalesce(actions('Execute_Agent_and_wait')?['error']?['message'], 'sem detalhe'), '</p><p>Verifique as entradas e saídas da ação <b>Execute_Agent_and_wait</b> no histórico do fluxo.</p>')}`,
              ),
            },
            else: {
              actions: {
                Responder_texto_insuficiente: {
                  type: 'Response',
                  kind: 'Http',
                  inputs: {
                    statusCode: 422,
                    headers: json,
                    body: {
                      ok: false,
                      mensagem: 'Texto insuficiente para extrair a matrícula.',
                      detalhe: `@{concat('Recebidos ', string(length(${T})), ' caracteres. Use o MatReader 4 ou mais novo, que extrai o texto do PDF (ou faz OCR) antes de enviar.')}`,
                      etapa: 'Validar_texto',
                    },
                  },
                  runAfter: {},
                },
              },
            },
            runAfter: {},
          },
        },
      },
      runAfter: { Texto_recebido: ['Succeeded'] },
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

const payload = {
  nodeId: 'Scope_MatReader_Converter_Matricula',
  serializedValue: scope,
  allConnectionData: {
    Execute_Agent_and_wait: conn('shared_microsoftcopilotstudio', cfg.conexaoCopilot, 'shared_microsoftcopilotstudio'),
    Avisar_no_Teams_resultado: conn('shared_teams', cfg.conexaoTeams, 'shared_teams-1'),
    Avisar_no_Teams_falha: conn('shared_teams', cfg.conexaoTeams, 'shared_teams-1'),
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
