import { authenticateAdminRequest } from '../../_lib/auth.js';
import {
  ApiRequest,
  ApiResponse,
  extractRouteId,
  parseJsonBody,
  sendJson,
  setNoStoreHeaders,
  verifyCsrfRequest,
} from '../../_lib/http.js';
import {
  readContactMessages,
  StoredContactMessage,
  VALID_ID_REGEX,
  writeContactMessages,
} from '../../_lib/storage.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  setNoStoreHeaders(res);

  if (req.method !== 'PATCH' && req.method !== 'DELETE') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  if (!verifyCsrfRequest(req)) {
    return sendJson(res, 403, { ok: false, error: 'Invalid request origin.' });
  }

  const session = authenticateAdminRequest(req);
  if (!session) {
    return sendJson(res, 401, { ok: false, error: 'Authentication required.' });
  }

  const messageId = extractRouteId(req);
  if (!messageId || !VALID_ID_REGEX.test(messageId)) {
    return sendJson(res, 400, { ok: false, error: 'Invalid message ID.' });
  }

  if (req.method === 'PATCH') {
    const body = await parseJsonBody(req);
    if (!body) {
      return sendJson(res, 400, { ok: false, error: 'Invalid request payload.' });
    }

    const { status } = body;
    if (status !== 'read' && status !== 'unread') {
      return sendJson(res, 400, { ok: false, error: 'Status must be read or unread.' });
    }

    const existing = readContactMessages();
    const idx = existing.findIndex((m) => m.id === messageId);
    if (idx === -1) {
      return sendJson(res, 404, { ok: false, error: 'Message not found.' });
    }

    const updated: StoredContactMessage = {
      ...existing[idx],
      status,
      updatedAt: new Date().toISOString(),
    };
    existing[idx] = updated;
    writeContactMessages(existing);

    return sendJson(res, 200, {
      ok: true,
      message: updated,
    });
  }

  // DELETE
  const existing = readContactMessages();
  const filtered = existing.filter((m) => m.id !== messageId);
  if (filtered.length === existing.length) {
    return sendJson(res, 404, { ok: false, error: 'Message not found.' });
  }

  writeContactMessages(filtered);
  return sendJson(res, 200, { ok: true });
}
