# Power Automate — MatReader → AI Builder → Copilot Studio

O scope `mat-flow/3.1` recebe o **documento**, faz a leitura com **Recognize text in image or document** do AI Builder e envia o texto reconhecido ao agente. O app não faz OCR, limpeza de texto ou redução de resolução neste modo. O AI Builder continua sendo OCR: isso não transforma o agente em leitor multimodal nem garante melhora em toda digitalização.

O protocolo continua `matreader/fluxo@3`, por tarefa. A confirmação HTTP acontece **antes da leitura e do agente**, para não depender de uma conexão aberta durante o processamento.

## Instalar ou atualizar

1. Gere o scope com seus dados:

   ```sh
   npm run scope -- --agente <nome_do_agente> --ambiente <Default-…> --conexao-copilot <shared-microsoftcopi-…> --conexao-onedrive <shared-onedriveforbu-…> --conexao-ai-builder <shared-commondataser-…>
   ```

   O resultado pessoal fica em `power-automate/local/scope-matreader.json`, fora do git. Sem argumentos, `npm run scope` atualiza `scope-matreader.template.json` com marcadores. Preencha agente e ambiente antes de colar o modelo. Os IDs de conexão podem ser obtidos de ações copiadas do seu fluxo; escolha as conexões no designer se necessário.

2. No gatilho **Quando uma solicitação HTTP é recebida**, mantenha POST e quem pode disparar **Qualquer pessoa**. Se houver um esquema JSON antigo exigindo texto não vazio, substitua-o por [`request-schema.json`](request-schema.json), que também aceita ping, consulta e conclusão.
3. Substitua o scope antigo pelo novo (não mantenha os dois respondendo ao mesmo gatilho). Cole o JSON no designer com **Colar uma ação** / Ctrl+V. Faça a troca quando não houver tarefas em andamento.
4. Selecione as conexões de **Copilot Studio**, **OneDrive for Business** e **AI Builder / Microsoft Dataverse**. O ambiente precisa de acesso ao AI Builder e capacidade/créditos para reconhecimento.
5. Confira `Recognize_text_in_image_or_document`, dentro de `Processar_documento → Ler_no_AI_Builder`. **Image** recebe `triggerBody()?['base64Encoded']` (base64 puro, sem prefixo `data:application/pdf;base64,`). A operação e o parâmetro foram montados a partir da ação fornecida; salvar e testar no seu ambiente é necessário para validar a conexão e o designer.
6. Salve. No MatReader, escolha **Configurações → Leitura no fluxo** e **Testar conexão**. O teste deve mostrar `mat-flow/3.1`, por tarefa, com leitura de arquivos. O ping não chama OCR/agente e não testa créditos nem a qualidade da leitura.
7. Converta uma matrícula conhecida e confira a saída do AI Builder e do agente no histórico do fluxo. Teste um documento ilegível para verificar a mensagem de erro no app.

## Caminho da execução

```text
converter → validar entrada → criar tarefa no OneDrive → responder ao app
  → Processar_documento
      → leitura=fluxo: reconhecer arquivo no AI Builder
      → Texto_para_agente: fullText do AI Builder ou texto do modo local
      → validar mínimo de 200 caracteres
          → prompt → agente → gravar resultado
          → texto insuficiente: gravar erro
  → falha/timeout na leitura, no agente ou na gravação: tentar gravar erro
consultar → ler /MatReader/tarefas/<id>.json
concluir  → apagar o arquivo da tarefa
ping      → anunciar versão e leitura_arquivo=true
```

`Texto_para_agente` usa `body('Recognize_text_in_image_or_document')?['responsev2']?['predictionOutput']?['fullText']`. Não precisa de loop por linha. O texto não passa pela limpeza local. O limite existente de **60.000 caracteres** enviados ao agente permanece; um corte gera `meta.truncado=true` e um alerta na conferência. Ajuste `--limite` de acordo com a capacidade do agente.

Se o OneDrive estiver indisponível também na tentativa de gravar o erro, o app pode chegar ao tempo-limite; consulte o histórico do fluxo. Ao fechar o app, a consulta pode ser retomada por até 45 minutos.

## Contrato de envio

```json
{
  "contrato": "matreader/fluxo@3",
  "acao": "converter",
  "leitura": "fluxo",
  "filename": "matricula.pdf",
  "mime_type": "application/pdf",
  "base64Encoded": "<PDF completo em base64>",
  "texto": "",
  "paginas": 3,
  "metodo_texto": "ai-builder",
  "ocr_confianca": null,
  "sha256": "<hash dos bytes do PDF>"
}
```

Um PDF único mantém seus bytes. Múltiplos PDFs/fotos viram um PDF na ordem de entrada; JPEG/PNG são incorporados e outros formatos de imagem são convertidos para PNG sem compressão com perda. PDF protegido deve ser desbloqueado antes do envio. O app rejeita mais de **20 MB** ou **2.000 páginas** em vez de reduzir qualidade ou enviar só parte do documento. A confiança do OCR remoto fica `null`, pois a saída dessa ação não fornece a média usada pelo leitor local.

No modo **Leitura no aparelho**, o app envia `leitura: "local"` e o texto como antes. O novo scope também aceita clientes antigos que enviam texto sem `leitura`. O modo remoto exige `leitura_arquivo: true` no ping; um scope antigo gera orientação para atualização, sem retorno silencioso ao OCR local.

## Referências

- [Reconhecimento de texto no Power Automate](https://learn.microsoft.com/en-us/ai-builder/flow-text-recognition): ação, entrada e texto completo.
- [Formatos e limites do AI Builder](https://learn.microsoft.com/en-us/ai-builder/prebuilt-text-recognition): tamanho máximo e páginas.
