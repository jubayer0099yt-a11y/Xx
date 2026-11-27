import { authenticateAdminRequest } from '../../_lib/auth.js';
import { ApiRequest, ApiResponse, sendJson, setNoStoreHeaders } from '../../_lib/http.js';
import { readContactMessages } from '../../_lib/storage.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  setNoStoreHeaders(res);
  if (req.method !== 'GET') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  const session = authenticateAdminRequest(req);
  if (!session) {
    return sendJson(res, 401, { ok: false, error: 'Authentication required.' });
  }

  const messages = readContactMessages().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return sendJson(res, 200, {
    ok: true,
    messages,
  });
}
