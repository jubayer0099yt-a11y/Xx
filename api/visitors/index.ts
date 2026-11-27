import { ApiRequest, ApiResponse, sendJson } from '../_lib/http.js';
import { getActiveOnline, getVisitorCount } from '../_lib/storage.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  return sendJson(res, 200, {
    count: getVisitorCount(),
    activeNow: getActiveOnline(),
  });
}
