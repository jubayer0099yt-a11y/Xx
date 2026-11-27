import fs from 'fs';
import {
  getConfiguredAdmin,
  hashPasswordScrypt,
  signAdminToken,
  StoredAdminCredentials,
  VALID_USERNAME_REGEX,
} from '../_lib/auth';
import {
  ApiRequest,
  ApiResponse,
  buildSessionCookieHeader,
  parseJsonBody,
  sendJson,
  setNoStoreHeaders,
  verifyCsrfRequest,
} from '../_lib/http';
import { getAdminAuthFilePath } from '../_lib/storage';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  setNoStoreHeaders(res);
  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  if (!verifyCsrfRequest(req)) {
    return sendJson(res, 403, { ok: false, error: 'Invalid request origin.' });
  }

  if (process.env.VERCEL) {
    return sendJson(res, 412, {
      ok: false,
      code: 'ENV_REQUIRED_ON_SERVERLESS',
      error:
        'Configure ADMIN_USERNAME, ADMIN_PASSWORD (or ADMIN_PASSWORD_HASH), and ADMIN_SESSION_SECRET in Vercel Environment Variables.',
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

  if (admin.configured) {
    return sendJson(res, 403, {
      ok: false,
      code: 'ALREADY_CONFIGURED',
      error: 'Admin credentials are already configured.',
    });
  }

  const body = await parseJsonBody(req);
  if (!body) {
    return sendJson(res, 400, { ok: false, error: 'Invalid request payload.' });
  }

  const { username, password } = body;
  if (typeof username !== 'string' || typeof password !== 'string') {
    return sendJson(res, 400, { ok: false, error: 'Username and password are required.' });
  }

  const cleanUsername = username.trim();
  if (!VALID_USERNAME_REGEX.test(cleanUsername)) {
    return sendJson(res, 400, {
      ok: false,
      error: 'Username must be 3-64 characters (letters, numbers, ., _, -).',
    });
  }

  if (password.length < 4 || password.length > 128) {
    return sendJson(res, 400, {
      ok: false,
      error: 'Password must be between 4 and 128 characters.',
    });
  }

  const credentials: StoredAdminCredentials = {
    username: cleanUsername,
    passwordHash: hashPasswordScrypt(password),
    createdAt: new Date().toISOString(),
  };

  try {
    const fd = fs.openSync(getAdminAuthFilePath(), 'wx', 0o600);
    try {
      fs.writeSync(fd, JSON.stringify(credentials, null, 2));
    } finally {
      fs.closeSync(fd);
    }
  } catch (err: unknown) {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code?: unknown }).code)
        : '';
    if (code === 'EEXIST') {
      return sendJson(res, 403, {
        ok: false,
        code: 'ALREADY_CONFIGURED',
        error: 'Admin credentials are already configured.',
      });
    }
    return sendJson(res, 500, {
      ok: false,
      error: 'Could not save admin credentials.',
    });
  }

  const token = signAdminToken(cleanUsername);
  res.setHeader('Set-Cookie', buildSessionCookieHeader(req, token));
  return sendJson(res, 201, {
    ok: true,
    username: cleanUsername,
  });
}
