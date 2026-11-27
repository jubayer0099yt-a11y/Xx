import crypto from 'crypto';
import { createRateLimiter } from './_lib/auth.js';
import {
  ApiRequest,
  ApiResponse,
  getClientIp,
  parseJsonBody,
  sendJson,
} from './_lib/http.js';
import {
  readContactMessages,
  VALID_ID_REGEX,
  writeContactMessages,
} from './_lib/storage.js';

function stripControlChars(value: string): string {
  return value.replace(/[\r\n\x00-\x1f\x7f]/g, ' ').trim();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const isContactRateLimited = createRateLimiter(10 * 60 * 1000, 5);

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  const clientIp = getClientIp(req);
  if (isContactRateLimited(clientIp)) {
    return sendJson(res, 429, {
      ok: false,
      error: 'Too many messages sent. Please wait a few minutes before trying again.',
    });
  }

  const body = await parseJsonBody(req);
  if (!body) {
    return sendJson(res, 400, { ok: false, error: 'Invalid request payload.' });
  }

  const { id: requestedId, name, email, message, website, formLoadedAt } = body;

  if (typeof website === 'string' && website.trim().length > 0) {
    return sendJson(res, 400, { ok: false, error: 'Spam check failed.' });
  }

  if (typeof formLoadedAt === 'number' && Number.isFinite(formLoadedAt)) {
    const elapsed = Date.now() - formLoadedAt;
    if (elapsed >= 0 && elapsed < 1200) {
      return sendJson(res, 400, { ok: false, error: 'Please take a moment before submitting.' });
    }
  }

  if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string') {
    return sendJson(res, 400, { ok: false, error: 'All fields are required.' });
  }

  const cleanName = stripControlChars(name);
  const cleanEmail = stripControlChars(email).toLowerCase();
  const cleanMessage = message.replace(/\x00/g, '').trim();

  if (cleanName.length < 2 || cleanName.length > 80) {
    return sendJson(res, 400, { ok: false, error: 'Name must be between 2 and 80 characters.' });
  }

  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;
  if (!emailRegex.test(cleanEmail) || cleanEmail.length > 120) {
    return sendJson(res, 400, { ok: false, error: 'Please provide a valid email address.' });
  }

  if (cleanMessage.length < 10 || cleanMessage.length > 1500) {
    return sendJson(res, 400, {
      ok: false,
      error: 'Message must be between 10 and 1500 characters.',
    });
  }

  const id =
    typeof requestedId === 'string' && VALID_ID_REGEX.test(requestedId)
      ? requestedId
      : crypto.randomUUID();
  let deliveredVia: 'email' | 'saved' = 'saved';

  const resendKey = process.env.RESEND_API_KEY;
  const recipientEmail = process.env.CONTACT_RECIPIENT_EMAIL || 'jubayer0099yt@gmail.com';

  if (resendKey && resendKey.trim().length > 0) {
    try {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'JUBAYER Contact <onboarding@resend.dev>',
          to: [recipientEmail],
          reply_to: cleanEmail,
          subject: `New Contact Message from ${cleanName}`,
          html: `<div style="font-family:sans-serif;max-width:560px;padding:16px;border:1px solid #e2e8f0;border-radius:8px;">
            <h2 style="margin:0 0 12px;color:#0f172a;">New Contact Message</h2>
            <p style="margin:4px 0;"><strong>Name:</strong> ${escapeHtml(cleanName)}</p>
            <p style="margin:4px 0;"><strong>Email:</strong> ${escapeHtml(cleanEmail)}</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:12px 0;" />
            <p style="white-space:pre-wrap;color:#334155;">${escapeHtml(cleanMessage)}</p>
          </div>`,
        }),
      });

      if (emailResponse.ok) {
        deliveredVia = 'email';
      }
    } catch {
      // Fallback to persistence if outbound email fails
    }
  }

  try {
    const existing = readContactMessages();
    existing.push({
      id,
      name: cleanName,
      email: cleanEmail,
      message: cleanMessage,
      status: 'unread',
      deliveredVia,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    });
    writeContactMessages(existing);
  } catch {
    return sendJson(res, 500, {
      ok: false,
      error: 'Could not save your message right now. Please try again later.',
    });
  }

  return sendJson(res, 201, {
    ok: true,
    id,
    deliveredVia,
  });
}
