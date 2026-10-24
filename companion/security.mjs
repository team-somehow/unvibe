import { timingSafeEqual } from 'node:crypto';

export class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

export function authorizeRequest(request, config, { publicHealth = false } = {}) {
  const host = request.headers.host || '';
  const port = config.port;
  if (![ `127.0.0.1:${port}`, `localhost:${port}` ].includes(host.toLowerCase())) throw new ApiError(403, 'INVALID_HOST', 'The companion accepts requests addressed to localhost only.');
  const origin = request.headers.origin;
  if (origin && !config.origins.has(origin)) throw new ApiError(403, 'ORIGIN_NOT_ALLOWED', 'This website is not paired with the local companion. Add its exact origin to LEARNAGRAM_ALLOWED_ORIGINS.');
  if (request.method === 'OPTIONS') {
    if (!origin) throw new ApiError(403, 'ORIGIN_REQUIRED', 'A browser origin is required for preflight requests.');
    return;
  }
  if (publicHealth) return;
  const authorization = request.headers.authorization || '';
  const actual = Buffer.from(authorization.startsWith('Bearer ') ? authorization.slice(7) : '');
  const expected = Buffer.from(config.token);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new ApiError(401, 'PAIRING_REQUIRED', 'Pair this browser using the connection link printed by your local companion.');
}

export async function jsonBody(request, limit = 4096) {
  if (!String(request.headers['content-type'] || '').startsWith('application/json')) throw new ApiError(415, 'JSON_REQUIRED', 'Send application/json.');
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > limit) throw new ApiError(413, 'BODY_TOO_LARGE', 'Request is too large.');
    chunks.push(chunk);
  }
  try { const value = JSON.parse(Buffer.concat(chunks).toString('utf8')); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); return value; }
  catch { throw new ApiError(400, 'INVALID_JSON', 'Send a JSON object.'); }
}

export function sanitize(input) {
  let text = String(input || '');
  let redactions = 0;
  const redact = (pattern, replacement = '[REDACTED]') => { text = text.replace(pattern, () => { redactions++; return replacement; }); };
  redact(/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g);
  redact(/\b(?:sk-(?:ant-)?[A-Za-z0-9_-]{16,}|sk_(?:live|test)_[A-Za-z0-9]{12,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[A-Z0-9]{16}|xox[baprs]-[A-Za-z0-9-]{10,})\b/g);
  redact(/\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g);
  redact(/\b(?:Bearer|Basic)\s+[A-Za-z0-9+/_=-]{12,}/gi);
  redact(/(?:https?|postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s:@/]+:[^\s@/]+@[^\s'"`]+/gi);
  redact(/\b(?:[A-Z][A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)[A-Z0-9_]*|api[_-]?key|access[_-]?token|client[_-]?secret|password)\s*[:=]\s*["']?[^\s"'`,;}{]{4,}["']?/gi);
  text = text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/gi, '').replace(/<environment_context>[\s\S]*?<\/environment_context>/gi, '').replace(/\u001b\[[0-9;]*m/g, '').trim();
  return { text, redactions };
}
