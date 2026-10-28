# Scope do Power Automate — MatReader ↔ agente do Copilot Studio

O arquivo `scope-matreader.template.json` é um **scope pronto para colar** no designer novo do Power Automate. Ele recebe o texto da matrícula enviado pelo MatReader, chama o agente do Copilot Studio (**Execute Agent and wait**) com o prompt de extração (CoT + CoVe) e **devolve o resultado ao app** pela ação **Resposta**.

## O que tem dentro

```
Config_MatReader            versão, agente, limite de caracteres (60 000), mínimo (200)
Texto_recebido              triggerBody().texto, sem espaços nas pontas
Rota_teste_ou_conversao     ping? → Responder_teste (200, sem gastar o agente)
  └─ senão: Validar_texto   ≥ 200 caracteres?
       ├─ Prompt_extracao   o prompt do agente (src/domain/prompts/agente.txt)
       ├─ Mensagem_agente   prompt + metadados + texto (cortado no limite, com aviso)
       ├─ Execute_Agent_and_wait   (tempo-limite de 10 min)
       ├─ Responder_sucesso        200 { ok, versao, resposta, meta }
       ├─ Responder_falha_agente   502/504 { ok:false, mensagem, detalhe, etapa }
       ├─ Avisar_no_Teams_resultado  se o app já tinha parado de esperar, o JSON chega no seu chat
       └─ Avisar_no_Teams_falha      idem, para a falha
       └─ senão: Responder_texto_insuficiente  422
```

O Power Automate encerra a resposta HTTP síncrona em cerca de **2 minutos**. Se o agente demorar mais, o app avisa e o fluxo **posta o resultado no seu chat do Teams (Flow bot)** — cole no MatReader com **Colar JSON**.

## Como usar

1. Gere a sua versão (com seus dados, fora do git):
   ```bash
   npm run scope -- --agente <nome_do_agente> --ambiente <Default-…> --email <voce@empresa.com> --conexao-copilot <shared-microsoftcopi-…> --conexao-teams <shared-teams-…>
   ```
   Sai em `power-automate/local/scope-matreader.json`. Os IDs de conexão aparecem no JSON de qualquer ação copiada do seu fluxo (`allConnectionData`).
2. No Power Automate, crie um fluxo com o gatilho **Quando uma solicitação HTTP é recebida** — método **POST**, **Quem pode disparar: Qualquer pessoa**.
3. Clique no **+** abaixo do gatilho → **Colar uma ação** (ou Ctrl+V) com o conteúdo do arquivo.
4. Salve e copie a **URL HTTP** do gatilho.
5. No MatReader: **Configurações → Fluxo do Power Automate**, cole a URL e clique em **Testar conexão**. A resposta deve dizer *scope mat-flow/2.0*.

> O modelo deste repositório usa marcadores (`{{AGENTE_COPILOT_STUDIO}}`, `{{ID_DO_AMBIENTE}}`, `{{SEU_EMAIL_NO_TEAMS}}`, `{{CONEXAO_…}}`). Não versione a sua versão pessoal: a pasta `power-automate/local/` está no `.gitignore`.
