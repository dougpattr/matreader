<script setup lang="ts">
import Icon from '@/components/ink/Icon.vue';
import InkSheet from '@/components/ink/InkSheet.vue';
import Picto from '@/components/ink/Picto.vue';
import { useModalsStore } from '@/stores/modals';

const modals = useModalsStore();
</script>

<template>
  <InkSheet :open="modals.help" title="Como usar" sub="Da matrícula em PDF ao documento conferido e ao terreno no mapa." picto="feather" narrow @close="modals.help = false">
      <div class="help">
        <p class="lead">O MatReader transforma a matrícula do imóvel em documento conferido, desenha o terreno sobre o satélite e junta arquivos. Funciona offline e cabe no bolso.</p>

        <h3><Picto name="feather" :size="26" />1 · Trazer a matrícula</h3>
        <ul>
          <li><b>Arraste o PDF ou as fotos</b> na paisagem da Entrada (ou toque em <b>Converter com IA</b>). No celular, <b>Fotografar</b> abre a câmera.</li>
          <li>O app lê o texto do PDF — ou faz <b>OCR no próprio aparelho</b> nas páginas digitalizadas — e envia só o texto ao seu fluxo do Power Automate, onde o agente do Copilot Studio devolve o JSON.</li>
          <li>Sem fluxo? <b>Copiar prompt</b>, cole numa IA com o arquivo e traga a resposta com <b>Colar JSON</b>.</li>
        </ul>

        <h3><Picto name="bird" :size="26" />2 · Acompanhar a jornada</h3>
        <p>A <b>Jornada</b> mostra cada estação (arquivo, texto, envio, agente, conferência), o tempo, o histórico e o texto exato que foi enviado. <b>Testar conexão</b> confere o fluxo sem gastar o agente.</p>

        <h3><Picto name="crystal" :size="26" />3 · Conferir</h3>
        <p>O <b>Resumo</b> roda as conferências: dígito de CPF/CNPJ, soma das frações, fechamento e cruzamento do polígono, área e perímetro calculados × declarados, cronologia, coordenadas no Brasil, resposta cortada e qualidade do OCR.</p>

        <h3><Picto name="mountain" :size="26" />4 · Encaixar o terreno</h3>
        <ul>
          <li>Com coordenadas, o satélite abre no lugar certo. Só com azimutes, <b>toque no mapa</b> para posicionar o vértice inicial.</li>
          <li><b>Arraste o polígono</b> para mover e o <b>pegador</b> para girar. <b>Ajuste fino</b> traz giro exato, espelhos, opacidade e a amarração.</li>
          <li>Sem internet, o modo <b>Desenho</b> mostra o polígono técnico. <b>Exportar</b> gera KML, KMZ, Google Maps ou croqui.</li>
        </ul>

        <h3><Picto name="pages" :size="26" />5 · Juntar PDFs e acervo</h3>
        <p>A fila junta PDFs e imagens no aparelho (arraste para ordenar). Toda matrícula com número é salva sozinha no <b>Acervo</b>; o exemplo nunca é salvo. Ações sem volta pedem para <b>segurar</b> o botão.</p>

        <h3><Icon name="sparkle" size="sm" />Atalhos</h3>
        <p><kbd>1</kbd>–<kbd>8</kbd> pulam entre os blocos · <kbd>Ctrl</kbd>+<kbd>S</kbd> salva · <kbd>Ctrl</kbd>+<kbd>P</kbd> imprime · <kbd>Ctrl</kbd>+<kbd>O</kbd> converte · <kbd>?</kbd> abre esta ajuda · <kbd>Esc</kbd> fecha a tela cheia.</p>

        <h3><Icon name="shield" size="sm" />O que sai do aparelho</h3>
        <p>Só o <b>texto da matrícula</b> (para o seu fluxo), as <b>imagens de satélite</b> e a <b>busca de endereço</b>. Documento, OCR, acervo, PDFs e impressão acontecem aqui dentro.</p>
      </div>
  </InkSheet>
</template>
<style scoped>
.help {
  display: grid;
  gap: var(--s2);
  font-size: 14px;
  line-height: 1.6;
  color: var(--ink-2);
}
.lead {
  font-size: 15px;
  color: var(--ink);
}
h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: var(--s4);
  font: 700 12.5px/1.3 var(--f-ui);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--slate-2);
}
ul {
  margin: 0;
  padding-left: 20px;
  display: grid;
  gap: 6px;
}
b {
  color: var(--ink);
}
</style>
