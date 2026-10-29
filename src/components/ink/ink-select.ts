/* Tipos do InkSelect (o seletor próprio do app, no lugar do ion-select). */
export interface InkOption<V extends string | number = string> {
  value: V;
  label: string;
  /** linha de apoio, em cinza, abaixo do rótulo */
  hint?: string;
}
