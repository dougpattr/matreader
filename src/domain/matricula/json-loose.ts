/* Leitor de JSON tolerante — escrito à mão, sem eval.
   A resposta de uma IA quase nunca é JSON puro: vem com texto antes,
   cerca ```json, aspas simples ou tipográficas, chave sem aspas, vírgula
   sobrando, None/True/False, comentário — e às vezes CORTADA no meio,
   quando o agente bate no limite de saída. Tudo isso é aceito aqui sem
   executar nada; cada conserto fica registrado para a conferência. */

export interface LooseResult {
  data: unknown;
  repairs: string[];
  truncated: boolean;
}

export class JsonLooseError extends Error {
  constructor(
    message: string,
    readonly line: number,
    readonly col: number,
  ) {
    super(message);
    this.name = 'JsonLooseError';
  }
}

/* aspas tipográficas que as IAs às vezes usam: “ ” ‘ ’ */
const LDQ = String.fromCharCode(0x201c);
const RDQ = String.fromCharCode(0x201d);
const LSQ = String.fromCharCode(0x2018);
const RSQ = String.fromCharCode(0x2019);
const OPEN_QUOTES = new Set(['"', "'", LDQ, RDQ, LSQ, RSQ]);
const WS = new Set([' ', '\t', '\n', '\r', String.fromCharCode(0xfeff), String.fromCharCode(0xa0)]);

class Parser {
  i = 0;
  readonly repairs = new Set<string>();
  truncated = false;

  constructor(private readonly s: string) {}

  fail(msg: string): never {
    const upto = this.s.slice(0, this.i);
    const line = upto.split('\n').length;
    const col = this.i - (upto.lastIndexOf('\n') + 1) + 1;
    const around = this.s.slice(Math.max(0, this.i - 24), this.i + 24).replace(/\s+/g, ' ');
    throw new JsonLooseError(`${msg} (linha ${line}, coluna ${col}) perto de: …${around}…`, line, col);
  }

  /** Fim inesperado: fecha o que estiver aberto e segue. */
  cut(): void {
    this.truncated = true;
    this.repairs.add('resposta cortada (fechada automaticamente)');
  }

  ws(): void {
    for (;;) {
      const c = this.s[this.i];
      if (c !== undefined && WS.has(c)) {
        this.i++;
        continue;
      }
      if (c === '/' && this.s[this.i + 1] === '/') {
        this.repairs.add('comentários');
        while (this.i < this.s.length && this.s[this.i] !== '\n') this.i++;
        continue;
      }
      if (c === '/' && this.s[this.i + 1] === '*') {
        this.repairs.add('comentários');
        this.i += 2;
        while (this.i < this.s.length && !(this.s[this.i] === '*' && this.s[this.i + 1] === '/')) this.i++;
        this.i += 2;
        continue;
      }
      return;
    }
  }

  value(): unknown {
    this.ws();
    const c = this.s[this.i];
    if (c === undefined) {
      this.cut();
      return null;
    }
    if (c === '{') return this.object();
    if (c === '[') return this.array();
    if (OPEN_QUOTES.has(c)) return this.string();
    return this.literal();
  }

  object(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    this.i++;
    let afterComma = false;
    for (;;) {
      this.ws();
      const c = this.s[this.i];
      if (c === undefined) {
        this.cut();
        return out;
      }
      if (c === '}') {
        if (afterComma) this.repairs.add('vírgula sobrando');
        this.i++;
        return out;
      }
      if (c === ',') {
        this.repairs.add('vírgula sobrando');
        this.i++;
        continue;
      }
      afterComma = false;
      const key = this.key();
      this.ws();
      const sep = this.s[this.i];
      if (sep === undefined) {
        this.cut();
        return out;
      }
      if (sep === ':' || sep === '=') this.i++;
      else this.fail(`faltou ":" depois da chave "${key}"`);
      out[key] = this.value();
      this.ws();
      const after = this.s[this.i];
      if (after === ',') {
        this.i++;
        afterComma = true;
        continue;
      }
      if (after === '}') {
        this.i++;
        return out;
      }
      if (after === undefined) {
        this.cut();
        return out;
      }
      this.repairs.add('vírgula faltando');
    }
  }

  array(): unknown[] {
    const out: unknown[] = [];
    this.i++;
    let afterComma = false;
    for (;;) {
      this.ws();
      const c = this.s[this.i];
      if (c === undefined) {
        this.cut();
        return out;
      }
      if (c === ']') {
        if (afterComma) this.repairs.add('vírgula sobrando');
        this.i++;
        return out;
      }
      if (c === ',') {
        this.repairs.add('vírgula sobrando');
        this.i++;
        continue;
      }
      afterComma = false;
      const before = this.i;
      const v = this.value();
      if (this.truncated && this.i >= this.s.length) {
        // último item cortado no meio: só entra se for um objeto com conteúdo
        if (v !== null && (typeof v !== 'object' || Object.keys(v as object).length)) out.push(v);
        return out;
      }
      out.push(v);
      if (this.i === before) this.fail('valor não reconhecido na lista');
      this.ws();
      const after = this.s[this.i];
      if (after === ',') {
        this.i++;
        afterComma = true;
        continue;
      }
      if (after === ']') {
        this.i++;
        return out;
      }
      if (after === undefined) {
        this.cut();
        return out;
      }
      this.repairs.add('vírgula faltando');
    }
  }

  key(): string {
    const c = this.s[this.i];
    if (c !== undefined && OPEN_QUOTES.has(c)) return this.string(true);
    let j = this.i;
    while (j < this.s.length && /[\w$\-.\p{L}]/u.test(this.s[j]!)) j++;
    if (j === this.i) this.fail('nome de campo inesperado');
    this.repairs.add('chave sem aspas');
    const k = this.s.slice(this.i, j);
    this.i = j;
    return k;
  }

  /** isKey: nome de campo fecha sempre na aspa (não tem aspas internas). */
  string(isKey = false): string {
    const quote = this.s[this.i]!;
    const closing = quote === LDQ ? RDQ : quote === LSQ ? RSQ : quote;
    if (quote !== '"') this.repairs.add('aspas fora do padrão');
    this.i++;
    let out = '';
    for (;;) {
      const c = this.s[this.i];
      if (c === undefined) {
        this.cut();
        return out;
      }
      if (c === '\\') {
        const n = this.s[this.i + 1];
        this.i += 2;
        if (n === 'n') out += '\n';
        else if (n === 't') out += '\t';
        else if (n === 'r') out += '\r';
        else if (n === 'b') out += '\b';
        else if (n === 'f') out += '\f';
        else if (n === 'u') {
          out += String.fromCharCode(parseInt(this.s.substr(this.i, 4), 16) || 0);
          this.i += 4;
        } else if (n !== undefined) out += n;
        continue;
      }
      if (c === closing) {
        // Aspas soltas no meio do texto (Sítio "São José"): só encerram se
        // o que vem depois for , } ] : ou o fim.
        const rest = this.s.slice(this.i + 1, this.i + 40);
        if (isKey || /^\s*([,}\]:]|$)/.test(rest)) {
          this.i++;
          return out;
        }
        this.repairs.add('aspas dentro do texto');
        out += c === '"' ? "'" : c;
        this.i++;
        continue;
      }
      if (c === '\n') {
        this.repairs.add('quebra de linha dentro do texto');
        out += ' ';
        this.i++;
        continue;
      }
      out += c;
      this.i++;
    }
  }

  literal(): unknown {
    const rest = this.s.slice(this.i, this.i + 64);
    const num = /^[-+]?(?:0[xX][0-9a-fA-F]+|\d+\.?\d*(?:[eE][-+]?\d+)?|\.\d+(?:[eE][-+]?\d+)?)/.exec(rest);
    if (num) {
      this.i += num[0].length;
      return /0[xX]/.test(num[0]) ? parseInt(num[0], 16) : parseFloat(num[0]);
    }
    const word = /^[A-Za-z_$][\w$]*/.exec(rest);
    if (!word) this.fail('valor não reconhecido');
    const w = word[0];
    this.i += w.length;
    const low = w.toLowerCase();
    if (low === 'true') return true;
    if (low === 'false') return false;
    if (low === 'null' || low === 'none' || low === 'undefined' || low === 'nan' || low === 'infinity') return null;
    // Envelopes de banco: ObjectId("…"), ISODate("…"), new Date(…)
    this.ws();
    if (this.s[this.i] === '(') {
      this.repairs.add('envelope de função');
      this.i++;
      const inner = this.value();
      this.ws();
      if (this.s[this.i] === ')') this.i++;
      return inner;
    }
    if (low === 'new') {
      this.repairs.add('envelope de função');
      return this.value();
    }
    this.repairs.add('texto sem aspas');
    return w;
  }
}

/** Acha o JSON dentro da resposta: cerca ```json, ou o primeiro { com seu
 *  par correspondente (ignorando chaves dentro de texto). */
export function extractJson(raw: string): string {
  const text = String(raw ?? '');
  const fence = text.match(/```(?:json|JSON)?\s*([\s\S]*?)(```|$)/);
  if (fence && fence[1] && /[{[]/.test(fence[1])) return fence[1].trim();
  const iObj = text.indexOf('{');
  const iArr = text.indexOf('[');
  const order = iArr >= 0 && (iObj < 0 || iArr < iObj) ? ['[', '{'] : ['{', '['];
  for (const open of order) {
    const close = open === '{' ? '}' : ']';
    const start = text.indexOf(open);
    if (start < 0) continue;
    let depth = 0;
    let inStr = false;
    let quote = '';
    let escaped = false;
    for (let i = start; i < text.length; i++) {
      const c = text[i];
      if (inStr) {
        if (escaped) escaped = false;
        else if (c === '\\') escaped = true;
        else if (c === quote) inStr = false;
        continue;
      }
      if (c === '"' || c === "'") {
        inStr = true;
        quote = c;
        continue;
      }
      if (c === open) depth++;
      else if (c === close) {
        depth--;
        if (depth === 0) return text.slice(start, i + 1);
      }
    }
    return text.slice(start); // não fechou: o leitor tolerante fecha e avisa
  }
  return text;
}

/** Lê o JSON (estrito primeiro, tolerante depois). Lança JsonLooseError
 *  com linha/coluna quando nem o modo tolerante consegue. */
export function parseLoose(raw: string): LooseResult {
  // JSON entregue inteiro como string ("{\"matricula\": …}") — comum em agentes
  const trimmed = String(raw ?? '').trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      const inner = JSON.parse(trimmed) as unknown;
      if (typeof inner === 'string' && /^\s*[{[]/.test(inner)) {
        const r = parseLoose(inner);
        return { ...r, repairs: ['JSON dentro de texto', ...r.repairs] };
      }
    } catch {}
  }
  const candidate = extractJson(raw);
  let result: LooseResult;
  try {
    result = { data: JSON.parse(candidate), repairs: [], truncated: false };
  } catch {
    const p = new Parser(candidate);
    const data = p.value();
    result = { data, repairs: [...p.repairs], truncated: p.truncated };
  }
  // JSON dentro de uma string ("{\"matricula\": …}") — comum em agentes
  if (typeof result.data === 'string' && /^\s*[{[]/.test(result.data)) {
    const inner = parseLoose(result.data);
    return { data: inner.data, repairs: ['JSON dentro de texto', ...result.repairs, ...inner.repairs], truncated: inner.truncated };
  }
  return result;
}
