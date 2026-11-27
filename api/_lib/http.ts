import type { IncomingMessage, ServerResponse } from 'http';

export const SESSION_COOKIE_NAME = 'jubayer_admin_session';
export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60; // 12 hours

export interface ApiRequest extends IncomingMessage {
  body?: unknown;
  query?: Record<string, unknown>;
  params?: Record<string, string | undefined>;
  ip?: string;
}

export interface ApiResponse extends ServerResponse {
  status?: (code: number) => ApiResponse;
  json?: (body: unknown) => void;
}

export function sendJson(res: ApiResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

export function setNoStoreHeaders(res: ApiResponse): void {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

export function getHeaderValue(
  req: ApiRequest,
  name: string
): string | undefined {
  const val = req.headers[name.toLowerCase()];
  if (Array.isArray(val)) return val[0];
  return typeof val === 'string' ? val : undefined;
}

export function getClientIp(req: ApiRequest): string {
  const forwarded = getHeaderValue(req, 'x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

export function isHttpsRequest(req: ApiRequest): boolean {
  const forwardedProto = getHeaderValue(req, 'x-forwarded-proto');
  if (forwardedProto) {
    const proto = forwardedProto.split(',')[0]?.trim().toLowerCase();
    if (proto === 'https') return true;
  }
  return Boolean((req.socket as { encrypted?: boolean } | undefined)?.encrypted);
}

export function buildSessionCookieHeader(req: ApiRequest, token: string): string {
  const base = `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Max-Age=${SESSION_MAX_AGE_SECONDS}`;
  if (isHttpsRequest(req)) {
    return `${base}; Secure; SameSite=None; Partitioned`;
  }
  return `${base}; SameSite=Lax`;
}

export function buildClearSessionCookieHeader(req: ApiRequest): string {
  const base = `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0`;
  if (isHttpsRequest(req)) {
    return `${base}; Secure; SameSite=None; Partitioned`;
  }
  return `${base}; SameSite=Lax`;
}

export function parseCookies(req: ApiRequest): Record<string, string> {
  const header = getHeaderValue(req, 'cookie');
  if (!header) return {};
  const result: Record<string, string> = {};
  for (const part of header.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = part.slice(0, eqIdx).trim();
    const rawVal = part.slice(eqIdx + 1).trim();
    if (!key) continue;
    try {
      result[key] = decodeURIComponent(rawVal);
    } catch {
      result[key] = rawVal;
    }
  }
  return result;
}

export function extractSessionToken(req: ApiRequest): string | null {
  const cookies = parseCookies(req);
  const cookieToken = cookies[SESSION_COOKIE_NAME];
  if (cookieToken && cookieToken.trim().length > 0) {
    return cookieToken.trim();
  }
  const authHeader = getHeaderValue(req, 'authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer.length > 0) return bearer;
  }
  return null;
}

export function verifyCsrfRequest(req: ApiRequest): boolean {
  const requestedWith = getHeaderValue(req, 'x-requested-with');
  if (requestedWith && requestedWith.toLowerCase() === 'xmlhttprequest') {
    return true;
  }

  const origin = getHeaderValue(req, 'origin');
  const host = getHeaderValue(req, 'x-forwarded-host') || getHeaderValue(req, 'host');
  if (origin && host) {
    try {
      const originHost = new URL(origin).host.toLowerCase();
      return originHost === host.split(',')[0].trim().toLowerCase();
    } catch {
      return false;
    }
  }

  return false;
}

export async function parseJsonBody(
  req: ApiRequest,
  maxBytes = 16 * 1024
): Promise<Record<string, unknown> | null> {
  if (req.body !== undefined) {
    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
      return req.body as Record<string, unknown>;
    }
    if (typeof req.body === 'string') {
      try {
        const parsed = JSON.parse(req.body);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        return null;
      }
    }
    return null;
  }

  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let aborted = false;

    req.on('data', (chunk: Buffer | string) => {
      if (aborted) return;
      const buf = typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk;
      totalBytes += buf.length;
      if (totalBytes > maxBytes) {
        aborted = true;
        resolve(null);
        return;
      }
      chunks.push(buf);
    });

    req.on('end', () => {
      if (aborted) return;
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          resolve(parsed as Record<string, unknown>);
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    });

    req.on('error', () => {
      if (!aborted) resolve(null);
    });
  });
}

export function extractRouteId(req: ApiRequest): string | null {
  if (req.params?.id && typeof req.params.id === 'string') {
    return req.params.id;
  }
  const qId = req.query?.id;
  if (typeof qId === 'string' && qId.length > 0) {
    return qId;
  }
  if (Array.isArray(qId) && typeof qId[0] === 'string' && qId[0].length > 0) {
    return qId[0];
  }
  if (req.url) {
    const cleanUrl = req.url.split('?')[0] || '';
    const segments = cleanUrl.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last && last !== 'messages') {
      return decodeURIComponent(last);
    }
  }
  return null;
}
