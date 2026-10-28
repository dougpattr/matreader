/* CPF e CNPJ conferidos pelo dígito verificador. */
import { onlyDigits } from '@/core/text';

export function validaCPF(v: unknown): boolean {
  const s = onlyDigits(v);
  if (s.length !== 11 || /^(\d)\1{10}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += +s[i]! * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== +s[9]!) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += +s[i]! * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === +s[10]!;
}

export function validaCNPJ(v: unknown): boolean {
  const s = onlyDigits(v);
  if (s.length !== 14 || /^(\d)\1{13}$/.test(s)) return false;
  const calc = (len: number) => {
    let pos = len - 7;
    let sum = 0;
    for (let i = 0; i < len; i++) {
      sum += +s[i]! * pos--;
      if (pos < 2) pos = 9;
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === +s[12]! && calc(13) === +s[13]!;
}

/** ok · bad (dígito não bate) · na (não é CPF nem CNPJ) · null (vazio) */
export function docStatus(doc: unknown): 'ok' | 'bad' | 'na' | null {
  const digits = onlyDigits(doc);
  if (!digits) return null;
  if (digits.length === 11) return validaCPF(digits) ? 'ok' : 'bad';
  if (digits.length === 14) return validaCNPJ(digits) ? 'ok' : 'bad';
  return 'na';
}
