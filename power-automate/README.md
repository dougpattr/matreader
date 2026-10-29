# Scope do Power Automate — MatReader ↔ agente do Copilot Studio

O arquivo `scope-matreader.template.json` é um **scope pronto para colar** no designer do Power Automate. Ele recebe o texto da matrícula enviado pelo MatReader, chama o agente do Copilot Studio (**Execute Agent and wait**) com o prompt de extração (CoT + CoVe) e **devolve o resultado ao app** — por tarefa, para não esbarrar no limite de ~2 min da resposta HTTP.

## Por que por tarefa (fluxo@3)

O Power Automate encerra a resposta HTTP síncrona em cerca de **2 minutos**; o agente costuma levar mais. No modelo antigo isso virava `504 … 'Responder_sucesso' is failed: the client application timed out`. Agora:

1. o app pede a conversão → o fluxo cria `/MatReader/tarefas/<tarefa>.json` no seu OneDrive com `{"status":"processando"}` e **responde na hora** com o número da tarefa;
2. o fluxo segue sozinho: chama o agente (até 20 min) e grava o resultado — ou a falha — no mesmo arquivo;
3. o app consulta a cada 5–10 s (`acao: "consultar"`) até o arquivo trazer o resultado e então pede `acao: "concluir"`, que apaga o arquivo.

Se você fechar a página no meio, o app guarda o número da tarefa e retoma a consulta quando abrir de novo.

## O que tem dentro

```
Config_MatReader            versão, agente, limite de caracteres (60 000), mínimo (200)
Texto_recebido              triggerBody().texto, sem espaços nas pontas
Tarefa_segura               número da tarefa sem barras, pontos, dois-pontos nem espaços (máx. 64)
Rota_por_acao (Switch)
  ├─ ping       → Responder_teste               200 { pong, versao: mat-flow/3.0, modo: tarefa }
  ├─ consultar  → Ler_tarefa (OneDrive)         → Responder_tarefa 200 | Responder_tarefa_inexistente 404
  ├─ concluir   → Localizar_tarefa → Apagar_tarefa (OneDrive) → Responder_concluida 200
  └─ converter  → Validar_texto (≥ 200 caracteres?)
        ├─ Criar_tarefa (OneDrive)    → Responder_aceito 200 { status: processando, tarefa }
        │                                (sem OneDrive → Responder_sem_onedrive 500)
        ├─ Prompt_extracao · Mensagem_agente
        ├─ Execute_Agent_and_wait     até 20 min, já sem ninguém esperando na linha
        ├─ Resultado_ok   → Gravar_resultado (OneDrive)
        └─ Resultado_erro → Gravar_falha (OneDrive)
        senão: Responder_texto_insuficiente 422
```

## Como usar

1. Gere a sua versão (com seus dados, fora do git):
   ```bash
   npm run scope -- --agente <nome_do_agente> --ambiente <Default-…> --conexao-copilot <shared-microsoftcopi-…> [--conexao-onedrive <shared-onedriveforbu-…>]
   ```
   Sai em `power-automate/local/scope-matreader.json`. Os IDs de conexão aparecem no JSON de qualquer ação copiada do seu fluxo (`allConnectionData`). Sem `--conexao-onedrive`, escolha a conexão depois de colar (passo 4).
2. No Power Automate, crie um fluxo com o gatilho **Quando uma solicitação HTTP é recebida** — método **POST**, **Quem pode disparar: Qualquer pessoa**.
3. Clique no **+** abaixo do gatilho → **Colar uma ação** (ou Ctrl+V) com o conteúdo do arquivo.
4. Nas ações do **OneDrive for Business** (Criar_tarefa, Ler_tarefa, Localizar_tarefa, Apagar_tarefa, Gravar_resultado, Gravar_falha), selecione a sua conexão se o designer pedir.
5. Salve e copie a **URL HTTP** do gatilho.
6. No MatReader: **Configurações → Fluxo do Power Automate**, cole a URL e clique em **Testar conexão**. A resposta deve dizer *scope mat-flow/3.0 · por tarefa*.

> O modelo deste repositório usa marcadores (`{{AGENTE_COPILOT_STUDIO}}`, `{{ID_DO_AMBIENTE}}`, `{{CONEXAO_COPILOT_STUDIO}}`). Não versione a sua versão pessoal: a pasta `power-automate/local/` está no `.gitignore`. O conector do OneDrive aceita até 100 chamadas por minuto por conexão; o app consulta no máximo a cada 5 s.
