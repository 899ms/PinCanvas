import { TemplateMissingError } from './errors';

const TEMPLATE_RE = /\{\{\s*([a-zA-Z0-9_.]+)(?::([a-zA-Z0-9_-]+))?\s*\}\}/g;
const FULL_RE = /^\{\{\s*([a-zA-Z0-9_.]+)(?::([a-zA-Z0-9_-]+))?\s*\}\}$/;

export type Vars = Record<string, unknown>;
const OMIT = Symbol('omit');

export interface ResolveJsonResult {
  kind: 'json';
  body: Record<string, unknown>;
}
export interface ResolveFormResult {
  kind: 'form';
  body: FormData;
}
export type ResolveResult = ResolveJsonResult | ResolveFormResult;

export function resolveTemplate(
  template: Record<string, unknown>,
  vars: Vars,
): ResolveResult {
  if (containsBlob(template)) {
    return { kind: 'form', body: buildForm(template, vars) };
  }
  return { kind: 'json', body: walkJson(template, vars) as Record<string, unknown> };
}

function containsBlob(t: unknown): boolean {
  if (typeof t === 'string') {
    const re = new RegExp(TEMPLATE_RE.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(t)) !== null) {
      if (m[2] === 'blob') return true;
    }
    return false;
  }
  if (Array.isArray(t)) return t.some(containsBlob);
  if (t && typeof t === 'object') {
    return Object.values(t as Record<string, unknown>).some(containsBlob);
  }
  return false;
}

function lookup(vars: Vars, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = vars;
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function convert(value: unknown, format: string | undefined, varName: string): unknown {
  if (value === undefined || value === null) throw new TemplateMissingError(varName);
  if (format === 'number') {
    const n = typeof value === 'number' ? value : parseInt(String(value), 10);
    if (Number.isNaN(n)) throw new TemplateMissingError(varName);
    return n;
  }
  return value;
}

function replaceString(s: string, vars: Vars): unknown {
  const full = s.match(FULL_RE);
  if (full) {
    const name = full[1];
    const fmt = full[2];
    const value = lookup(vars, name);
    if (fmt === 'optional' && (value === undefined || value === null)) return OMIT;
    return convert(value, fmt, name);
  }
  return s.replace(TEMPLATE_RE, (_m, name: string, fmt: string | undefined) => {
    const v = lookup(vars, name);
    if (v === undefined || v === null) throw new TemplateMissingError(name);
    return String(convert(v, fmt, name));
  });
}

function walkJson(t: unknown, vars: Vars): unknown {
  if (typeof t === 'string') return replaceString(t, vars);
  if (Array.isArray(t)) return t.map((v) => walkJson(v, vars));
  if (t && typeof t === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(t as Record<string, unknown>)) {
      const resolved = walkJson(v, vars);
      if (resolved !== OMIT) out[k] = resolved;
    }
    return out;
  }
  return t;
}

function buildForm(t: Record<string, unknown>, vars: Vars): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries(t)) {
    if (typeof v === 'string') {
      const resolved = replaceString(v, vars);
      if (resolved !== OMIT) appendValue(form, k, resolved);
    } else if (Array.isArray(v)) {
      for (const item of v) {
        if (typeof item === 'string') appendValue(form, k, replaceString(item, vars));
        else appendValue(form, k, item);
      }
    } else if (v && typeof v === 'object' && !(v instanceof Blob)) {
      appendValue(form, k, JSON.stringify(walkJson(v, vars)));
    } else {
      appendValue(form, k, v);
    }
  }
  return form;
}

function appendValue(form: FormData, key: string, v: unknown): void {
  if (v === undefined || v === null) return;
  if (Array.isArray(v)) {
    // 数组按同 key 多次 append（OpenAI multipart 多图协议）
    for (const item of v) appendValue(form, key, item);
    return;
  }
  if (v instanceof Blob) {
    form.append(key, v);
  } else if (typeof v === 'object') {
    form.append(key, JSON.stringify(v));
  } else {
    form.append(key, String(v));
  }
}
