import { revokeAdminToken } from '../_lib/auth.js';
import {
  ApiRequest,
  ApiResponse,
  buildClearSessionCookieHeader,
  extractSessionToken,
  sendJson,
  setNoStoreHeaders,
  verifyCsrfRequest,
} from '../_lib/http.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  setNoStoreHeaders(res);
  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  if (!verifyCsrfRequest(req)) {
    return sendJson(res, 403, { ok: false, error: 'Invalid request origin.' });
  }

  const token = extractSessionToken(req);
  if (token) {
    revokeAdminToken(token);
  }

  res.setHeader('Set-Cookie', buildClearSessionCookieHeader(req));
  return sendJson(res, 200, { ok: true });
}
