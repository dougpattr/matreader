/* Seletor de arquivos sem <input> espalhado pela tela. capture abre a
   câmera traseira no celular (fotografar as páginas da matrícula). */

export interface PickOptions {
  accept: string;
  multiple?: boolean;
  capture?: boolean;
}

export const ACCEPT_DOCS = '.pdf,.jpg,.jpeg,.png,.jfif,.webp,.bmp,application/pdf,image/*';
export const ACCEPT_JSON = '.json,application/json';

export function pickFiles(o: PickOptions): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = o.accept;
    input.multiple = !!o.multiple;
    if (o.capture) input.setAttribute('capture', 'environment');
    input.style.display = 'none';
    let done = false;
    const finish = (files: File[]) => {
      if (done) return;
      done = true;
      input.remove();
      resolve(files);
    };
    input.addEventListener('change', () => finish(Array.from(input.files ?? [])));
    input.addEventListener('cancel', () => finish([]));
    document.body.appendChild(input);
    input.click();
  });
}
