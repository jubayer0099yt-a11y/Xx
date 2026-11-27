import { authenticateAdminRequest } from '../_lib/auth';
import { ApiRequest, ApiResponse, sendJson, setNoStoreHeaders } from '../_lib/http';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  setNoStoreHeaders(res);
  if (req.method !== 'GET') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  const session = authenticateAdminRequest(req);
  if (!session) {
    return sendJson(res, 401, {
      ok: false,
      authenticated: false,
      error: 'Authentication required.',
    });
  }

  return sendJson(res, 200, {
    ok: true,
    authenticated: true,
    username: session.sub,
  });
}
