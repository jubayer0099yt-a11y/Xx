import { getConfiguredAdmin } from '../_lib/auth';
import { ApiRequest, ApiResponse, sendJson, setNoStoreHeaders } from '../_lib/http';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  setNoStoreHeaders(res);
  if (req.method !== 'GET') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  const admin = getConfiguredAdmin();
  return sendJson(res, 200, {
    ok: true,
    configured: admin.configured,
    invalidHashConfig: admin.invalidHashConfig,
    missingSessionSecret: admin.missingSessionSecret,
    source: admin.source,
  });
}
