import { ApiRequest, ApiResponse, sendJson } from '../_lib/http';
import { getActiveOnline, getVisitorCount, saveVisitorCount } from '../_lib/storage';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  const nextCount = getVisitorCount() + 1;
  saveVisitorCount(nextCount);

  return sendJson(res, 200, {
    count: nextCount,
    activeNow: getActiveOnline(),
  });
}
