import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '16kb' }));

  // Data persistence for real-time visitors and contact messages
  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const counterFile = path.join(dataDir, 'visitors.json');
  const contactFile = path.join(dataDir, 'contact_messages.json');

  // Baseline real visitor count for Jubayer's profile
  const BASELINE_COUNT = 3480;

  function getCount(): number {
    try {
      if (fs.existsSync(counterFile)) {
        const raw = fs.readFileSync(counterFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (typeof parsed.count === 'number' && parsed.count >= BASELINE_COUNT) {
          return parsed.count;
        }
      }
    } catch {}
    return BASELINE_COUNT;
  }

  function saveCount(count: number) {
    try {
      fs.writeFileSync(
        counterFile,
        JSON.stringify({ count, lastUpdated: new Date().toISOString() }, null, 2)
      );
    } catch {}
  }

  // Active online simulator based on time of day
  function getActiveOnline(): number {
    const hour = new Date().getHours();
    return Math.floor(4 + Math.sin(hour / 3) * 3 + (Date.now() % 3));
  }

  // Per-IP sliding window rate limiter for /api/contact (max 5 requests per 10 min)
  const contactRateMap = new Map<string, number[]>();
  const RATE_WINDOW_MS = 10 * 60 * 1000;
  const RATE_MAX_REQUESTS = 5;

  function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const history = (contactRateMap.get(ip) || []).filter((ts) => now - ts < RATE_WINDOW_MS);
    if (history.length >= RATE_MAX_REQUESTS) {
      contactRateMap.set(ip, history);
      return true;
    }
    history.push(now);
    contactRateMap.set(ip, history);
    if (contactRateMap.size > 500) {
      for (const [k, v] of contactRateMap.entries()) {
        if (v.every((ts) => now - ts >= RATE_WINDOW_MS)) {
          contactRateMap.delete(k);
        }
      }
    }
    return false;
  }

  interface StoredContactMessage {
    id: string;
    name: string;
    email: string;
    message: string;
    deliveredVia: 'email' | 'saved';
    createdAt: string;
  }

  function saveContactMessage(entry: StoredContactMessage) {
    let existing: StoredContactMessage[] = [];
    try {
      if (fs.existsSync(contactFile)) {
        const raw = fs.readFileSync(contactFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) existing = parsed;
      }
    } catch {
      existing = [];
    }
    existing.push(entry);
    // Keep most recent 500 messages bounded on disk
    const trimmed = existing.slice(-500);
    fs.writeFileSync(contactFile, JSON.stringify(trimmed, null, 2));
  }

  // API Endpoints
  app.get('/api/visitors', (req, res) => {
    res.json({
      count: getCount(),
      activeNow: getActiveOnline(),
    });
  });

  app.post('/api/visitors/hit', (req, res) => {
    const nextCount = getCount() + 1;
    saveCount(nextCount);
    res.json({
      count: nextCount,
      activeNow: getActiveOnline(),
    });
  });

  app.post('/api/contact', async (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (isRateLimited(clientIp)) {
      return res.status(429).json({
        ok: false,
        error: 'Too many messages sent. Please wait a few minutes before trying again.',
      });
    }

    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ ok: false, error: 'Invalid request payload.' });
    }

    const { name, email, message, website, formLoadedAt } = body as Record<string, unknown>;

    // Spam protection: honeypot check
    if (typeof website === 'string' && website.trim().length > 0) {
      return res.status(400).json({ ok: false, error: 'Spam check failed.' });
    }

    // Spam protection: minimum human fill duration (1.2s)
    if (typeof formLoadedAt === 'number' && Number.isFinite(formLoadedAt)) {
      const elapsed = Date.now() - formLoadedAt;
      if (elapsed >= 0 && elapsed < 1200) {
        return res.status(400).json({ ok: false, error: 'Please take a moment before submitting.' });
      }
    }

    if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string') {
      return res.status(400).json({ ok: false, error: 'All fields are required.' });
    }

    const cleanName = stripControlChars(name);
    const cleanEmail = stripControlChars(email).toLowerCase();
    const cleanMessage = message.replace(/\x00/g, '').trim();

    if (cleanName.length < 2 || cleanName.length > 80) {
      return res.status(400).json({ ok: false, error: 'Name must be between 2 and 80 characters.' });
    }

    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;
    if (!emailRegex.test(cleanEmail) || cleanEmail.length > 120) {
      return res.status(400).json({ ok: false, error: 'Please provide a valid email address.' });
    }

    if (cleanMessage.length < 10 || cleanMessage.length > 1500) {
      return res.status(400).json({
        ok: false,
        error: 'Message must be between 10 and 1500 characters.',
      });
    }

    const id = crypto.randomUUID();
    let deliveredVia: 'email' | 'saved' = 'saved';

    // Optional real outbound email forwarding via Resend if configured in server environment
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
        // Fallback to server persistence if outbound email network call fails
      }
    }

    try {
      saveContactMessage({
        id,
        name: cleanName,
        email: cleanEmail,
        message: cleanMessage,
        deliveredVia,
        createdAt: new Date().toISOString(),
      });
    } catch {
      return res.status(500).json({
        ok: false,
        error: 'Could not save your message right now. Please try again later.',
      });
    }

    return res.status(201).json({
      ok: true,
      id,
      deliveredVia,
    });
  });

  // Vite middleware for dev or static for production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
