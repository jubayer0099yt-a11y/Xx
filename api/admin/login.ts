import {
  createRateLimiter,
  getConfiguredAdmin,
  signAdminToken,
  timingSafeTextEqual,
  verifyPasswordScrypt,
} from '../_lib/auth.js';
import {
  ApiRequest,
  ApiResponse,
  buildSessionCookieHeader,
  getClientIp,
  parseJsonBody,
  sendJson,
  setNoStoreHeaders,
} from '../_lib/http.js';

const isLoginRateLimited = createRateLimiter(10 * 60 * 1000, 10);

export default async function handler(req: ApiRequest, res: ApiResponse) {
  setNoStoreHeaders(res);
  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  const clientIp = getClientIp(req);
  if (isLoginRateLimited(clientIp)) {
    return sendJson(res, 429, {
      ok: false,
      code: 'RATE_LIMITED',
      error: 'Too many login attempts. Please wait a few minutes and try again.',
    });
  }

  const admin = getConfiguredAdmin();
  if (admin.invalidHashConfig) {
    return sendJson(res, 500, {
      ok: false,
      code: 'INVALID_HASH_CONFIG',
      error:
        'Server ADMIN_PASSWORD_HASH format is invalid. Use scrypt$salt$hash or set ADMIN_PASSWORD.',
    });
  }

  if (admin.missingSessionSecret) {
    return sendJson(res, 500, {
      ok: false,
      code: 'MISSING_SESSION_SECRET',
      error:
        'ADMIN_SESSION_SECRET environment variable must be configured (at least 16 characters) on serverless hosting.',
    });
  }

  if (!admin.configured || !admin.username || !admin.passwordHash) {
    return sendJson(res, 412, {
      ok: false,
      code: 'NOT_CONFIGURED',
      error: 'Admin account is not configured yet.',
    });
  }

  const body = await parseJsonBody(req);
  if (!body) {
    return sendJson(res, 400, { ok: false, error: 'Invalid login payload.' });
  }

  const { username, password } = body;
  if (typeof username !== 'string' || typeof password !== 'string') {
    return sendJson(res, 400, { ok: false, error: 'Username and password are required.' });
  }

  const cleanUsername = username.trim();
  if (!cleanUsername || !password) {
    return sendJson(res, 400, { ok: false, error: 'Username and password are required.' });
  }

  const usernameValid = timingSafeTextEqual(cleanUsername, admin.username);
  const passwordValid = verifyPasswordScrypt(password, admin.passwordHash);

  if (!usernameValid || !passwordValid) {
    return sendJson(res, 401, {
      ok: false,
      code: 'INVALID_CREDENTIALS',
      error: 'Invalid username or password.',
    });
  }

  const token = signAdminToken(admin.username);
  res.setHeader('Set-Cookie', buildSessionCookieHeader(req, token));
  return sendJson(res, 200, {
    ok: true,
    username: admin.username,
  });
}
