const FORMULA_PREFIX = /^\s*[=+\-@]/;

export function sanitizeCsvCell(value: unknown) {
  const text = String(value);
  return FORMULA_PREFIX.test(text) ? `'${text}` : text;
}
