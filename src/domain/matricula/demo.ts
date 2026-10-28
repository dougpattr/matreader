/* EXEMPLO FICTÍCIO — exercita tudo: UTM no vértice inicial, polígono que
   fecha, condomínio, ônus ativo e cancelado, documento com dígito errado e
   bloco de verificação da IA. Nenhum dado real: cartório, pessoas e
   códigos são inventados. */
export const DEMO_MATRICULA = {
  matricula: {
    numero: '42.317',
    cartorio: 'Registro de Imóveis da Comarca de Vila Modelo — 1º Ofício',
    codigo_cns: '12.345-6',
    comarca: 'Vila Modelo',
    uf: 'SP',
    status_matricula: 'Ativa',
    data_abertura: '2009-03-12',
  },
  imovel: {
    endereco_completo: 'Estrada Municipal VM-050, km 7, s/nº, Bairro dos Pinheiros, Vila Modelo/SP',
    denominacao: 'Sítio Boa Esperança',
    tipo_imovel: 'Rural',
    descricao_detalhada:
      'Um imóvel rural denominado Sítio Boa Esperança, com área de 125.906,50 m² (12,5907 ha), de formato irregular e topografia suavemente ondulada, situado à margem direita da Estrada Municipal VM-050, no Bairro dos Pinheiros, contendo casa-sede de alvenaria com 180,00 m², galpão de 240,00 m², pomar e nascente preservada em área de reserva legal averbada.',
    area_total_m2: 126500.0,
    area_construida_m2: 420.0,
    confrontacoes:
      'Frente para a Estrada Municipal VM-050, numa extensão de 300,00 m; lado direito com o Sítio das Acácias, de Antônio Fictício; lado esquerdo com a Fazenda Santa Clara; fundos com o córrego dos Pinheiros e com a gleba remanescente da matrícula 12.004.',
    numero_contribuinte_iptu: '3.05.010.0042.001',
  },
  codigos_oficiais: {
    car_numero: 'SP-3500105-A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6',
    codigo_sigef: '7a1c2e40-5b9d-4f31-8a6e-2c0d9f7b1234',
    codigo_incra_ccir: '907.123.456.789-0',
    nirf_itr: '1.234.567-8',
    codigo_nacional_matricula: null,
    inscricao_imobiliaria: null,
  },
  georreferenciamento: {
    datum: 'SIRGAS2000',
    zona_utm: '23S',
    area_georreferenciada_ha: 12.5907,
    perimetro_m: 1359.8,
    responsavel_tecnico: 'Eng. Agrim. Joana Exemplo — CREA-SP 0000000000',
    art_trt: '28027230200000000',
  },
  dados_geoespaciais: [
    { segmento_descricao: 'De P-01 a P-02 (frente)', vertice_origem: 'P-01', vertice_destino: 'P-02', azimute_rumo: '90°00\'00"', distancia_m: 300.0, coordenada_x: null, coordenada_y: null, utm_e: 262000.0, utm_n: 7485000.0, confrontante: 'Estrada Municipal VM-050' },
    { segmento_descricao: 'De P-02 a P-03', vertice_origem: 'P-02', vertice_destino: 'P-03', azimute_rumo: '160°00\'00"', distancia_m: 200.0, coordenada_x: null, coordenada_y: null, utm_e: null, utm_n: null, confrontante: 'Sítio das Acácias' },
    { segmento_descricao: 'De P-03 a P-04', vertice_origem: 'P-03', vertice_destino: 'P-04', azimute_rumo: '225°00\'00"', distancia_m: 180.0, coordenada_x: null, coordenada_y: null, utm_e: null, utm_n: null, confrontante: 'Sítio das Acácias' },
    { segmento_descricao: 'De P-04 a P-05 (fundos)', vertice_origem: 'P-04', vertice_destino: 'P-05', azimute_rumo: '270°00\'00"', distancia_m: 250.0, coordenada_x: null, coordenada_y: null, utm_e: null, utm_n: null, confrontante: 'Córrego dos Pinheiros' },
    { segmento_descricao: 'De P-05 a P-06', vertice_origem: 'P-05', vertice_destino: 'P-06', azimute_rumo: '315°00\'00"', distancia_m: 200.0, coordenada_x: null, coordenada_y: null, utm_e: null, utm_n: null, confrontante: 'Fazenda Santa Clara' },
    { segmento_descricao: 'De P-06 a P-01 (fechamento)', vertice_origem: 'P-06', vertice_destino: 'P-01', azimute_rumo: '40°51\'36"', distancia_m: 229.78, coordenada_x: null, coordenada_y: null, utm_e: null, utm_n: null, confrontante: 'Fazenda Santa Clara' },
  ],
  proprietarios_atuais: [
    { nome: 'MARIA APARECIDA EXEMPLO DE SOUZA', cpf_cnpj: '529.982.247-25', participacao_percentual: 50, estado_civil: 'Casada', regime_bens: 'Comunhão parcial de bens', conjuge: 'JOÃO CARLOS EXEMPLO DE SOUZA' },
    { nome: 'AGROPECUÁRIA MODELO LTDA', cpf_cnpj: '11.222.333/0001-81', participacao_percentual: 50, estado_civil: null, regime_bens: null, conjuge: null },
  ],
  onus_e_gravames: [
    { tipo: 'Hipoteca', situacao: 'cancelado', credor_garantidor: 'Banco Fictício S.A.', ato_constituicao: 'R.4', ato_cancelamento: 'AV.7', valor: 300000, descricao: 'Garantia de cédula rural pignoratícia' },
    { tipo: 'Alienação fiduciária', situacao: 'ativo', credor_garantidor: 'Banco Exemplo S.A.', ato_constituicao: 'R.9', ato_cancelamento: null, valor: 450000, descricao: 'Financiamento de custeio agrícola' },
  ],
  historico_atos: [
    { identificador: 'R.1', tipo: 'Registro', data_ato: '2009-03-12', resumo_fato: 'Abertura da matrícula por desmembramento da matrícula 12.004, com aquisição por compra e venda.', efeito: 'Transferência de propriedade', valor_transacao: 180000, cancelado: false },
    { identificador: 'AV.2', tipo: 'Averbação', data_ato: '2011-06-20', resumo_fato: 'Averbação da certificação do georreferenciamento junto ao INCRA, com memorial descritivo assinado pela responsável técnica.', efeito: 'Descritivo georreferenciado', valor_transacao: null, cancelado: false },
    { identificador: 'AV.3', tipo: 'Averbação', data_ato: '2012-09-08', resumo_fato: 'Averbação da reserva legal correspondente a 20% da área total, com anuência do órgão ambiental.', efeito: 'Restrição ambiental', valor_transacao: null, cancelado: false },
    { identificador: 'R.4', tipo: 'Registro', data_ato: '2014-08-05', resumo_fato: 'Constituição de hipoteca em favor do Banco Fictício S.A. em garantia de cédula rural.', efeito: 'Ônus real', valor_transacao: 300000, cancelado: true },
    { identificador: 'AV.7', tipo: 'Averbação', data_ato: '2018-02-14', resumo_fato: 'Cancelamento integral da hipoteca constituída pelo R.4, mediante quitação comprovada.', efeito: 'Baixa do ônus', valor_transacao: null, cancelado: false },
    { identificador: 'R.9', tipo: 'Registro', data_ato: '2021-11-03', resumo_fato: 'Alienação fiduciária em garantia em favor do Banco Exemplo S.A.', efeito: 'Ônus real', valor_transacao: 450000, cancelado: false },
    { identificador: 'R.10', tipo: 'Registro', data_ato: '2023-05-19', resumo_fato: 'Compra e venda: Carlos Eduardo Fictício vende a Maria Aparecida Exemplo de Souza e à Agropecuária Modelo Ltda., em partes iguais.', efeito: 'Transferência de propriedade', valor_transacao: 1250000, cancelado: false },
  ],
  lista_completa_nomes: [
    { nome_extraido: 'CARLOS EDUARDO FICTÍCIO', tipo_pessoa: 'Física', documento: '123.456.789-00', papel_inferido: 'Vendedor', citado_no_ato: 'R.10' },
    { nome_extraido: 'MARIA APARECIDA EXEMPLO DE SOUZA', tipo_pessoa: 'Física', documento: '529.982.247-25', papel_inferido: 'Compradora', citado_no_ato: 'R.10' },
    { nome_extraido: 'JOÃO CARLOS EXEMPLO DE SOUZA', tipo_pessoa: 'Física', documento: null, papel_inferido: 'Cônjuge da compradora', citado_no_ato: 'R.10' },
    { nome_extraido: 'AGROPECUÁRIA MODELO LTDA', tipo_pessoa: 'Jurídica', documento: '11.222.333/0001-81', papel_inferido: 'Compradora', citado_no_ato: 'R.10' },
    { nome_extraido: 'BANCO EXEMPLO S.A.', tipo_pessoa: 'Jurídica', documento: null, papel_inferido: 'Credor fiduciário', citado_no_ato: 'R.9' },
    { nome_extraido: 'JOANA EXEMPLO', tipo_pessoa: 'Física', documento: 'CREA-SP 0000000000', papel_inferido: 'Responsável técnica do georreferenciamento', citado_no_ato: 'AV.2' },
  ],
  verificacao: {
    vertices_declarados: 6,
    vertices_extraidos: 6,
    soma_participacoes: 100,
    checagens: [
      { pergunta: 'Quantos vértices o memorial declara?', resultado: 'ok', evidencia: 'inicia no P-01 e encerra no P-06, com 6 lances' },
      { pergunta: 'O ato que define a propriedade está vigente?', resultado: 'ok', evidencia: 'R.10 sem averbação de cancelamento posterior' },
      { pergunta: 'A hipoteca do R.4 continua ativa?', resultado: 'divergente', evidencia: "AV.7 cancela integralmente — corrigido para situacao 'cancelado'" },
    ],
    alertas: ['A área do cabeçalho (126.500,00 m²) difere da área do memorial (125.906,50 m²) em 0,47%.'],
  },
  observacoes_auditoria:
    'Exemplo fictício de demonstração. O vértice inicial foi informado em coordenadas UTM (fuso 23S, SIRGAS2000) e os demais lances por azimute e distância — o aplicativo converte a UTM e fecha o polígono.',
};
