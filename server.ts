import 'dotenv/config';
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

function timingSafeTextEqual(a: string, b: string): boolean {
  const key = crypto.randomBytes(32);
  const digestA = crypto.createHmac('sha256', key).update(a, 'utf8').digest();
  const digestB = crypto.createHmac('sha256', key).update(b, 'utf8').digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

function isValidScryptHashFormat(storedHash: string): boolean {
  const parts = storedHash.split('$');
  return (
    parts.length === 3 &&
    parts[0] === 'scrypt' &&
    Boolean(parts[1]) &&
    /^[0-9a-fA-F]+$/.test(parts[2] || '') &&
    (parts[2]?.length || 0) >= 32 &&
    (parts[2]?.length || 0) % 2 === 0
  );
}

function hashPasswordScrypt(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPasswordScrypt(password: string, storedHash: string): boolean {
  if (!isValidScryptHashFormat(storedHash)) {
    return false;
  }
  const [, salt, expectedHex] = storedHash.split('$');
  try {
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    const derivedBuf = crypto.scryptSync(password, salt, expectedBuf.length);
    return (
      derivedBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(derivedBuf, expectedBuf)
    );
  } catch {
    return false;
  }
}

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;
const VALID_USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,64}$/;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

interface StoredContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  status: 'unread' | 'read';
  deliveredVia: 'email' | 'saved';
  createdAt: string;
  updatedAt: string | null;
}

interface StoredAdminCredentials {
  username: string;
  passwordHash: string;
  createdAt: string;
}

interface AdminTokenPayload {
  sub: string;
  jti: string;
  iat: number;
  exp: number;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '16kb' }));

  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const counterFile = path.join(dataDir, 'visitors.json');
  const contactFile = path.join(dataDir, 'contact_messages.json');
  const adminAuthFile = path.join(dataDir, 'admin_credentials.json');

  const sessionSecret =
    process.env.ADMIN_SESSION_SECRET && process.env.ADMIN_SESSION_SECRET.trim().length >= 16
      ? process.env.ADMIN_SESSION_SECRET.trim()
      : crypto.randomBytes(32).toString('hex');

  const revokedTokenJtis = new Set<string>();

  // Cache scrypt hash derived from ADMIN_PASSWORD env secret (recomputes only if env changes)
  let cachedPlainSource: string | null = null;
  let cachedPlainHash: string | null = null;

  function getConfiguredAdmin(): {
    configured: boolean;
    invalidHashConfig: boolean;
    source: 'env' | 'file' | 'none';
    username: string | null;
    passwordHash: string | null;
  } {
    const envUsername = process.env.ADMIN_USERNAME?.trim();
    const rawEnvHash = process.env.ADMIN_PASSWORD_HASH?.trim();
    const envPlainPassword = process.env.ADMIN_PASSWORD;

    if (envUsername && rawEnvHash) {
      if (!isValidScryptHashFormat(rawEnvHash)) {
        return {
          configured: false,
          invalidHashConfig: true,
          source: 'env',
          username: envUsername,
          passwordHash: null,
        };
      }
      return {
        configured: true,
        invalidHashConfig: false,
        source: 'env',
        username: envUsername,
        passwordHash: rawEnvHash,
      };
    }

    if (envUsername && typeof envPlainPassword === 'string' && envPlainPassword.length > 0) {
      if (cachedPlainSource !== envPlainPassword || !cachedPlainHash) {
        cachedPlainSource = envPlainPassword;
        cachedPlainHash = hashPasswordScrypt(envPlainPassword);
      }
      return {
        configured: true,
        invalidHashConfig: false,
        source: 'env',
        username: envUsername,
        passwordHash: cachedPlainHash,
      };
    }

    try {
      if (fs.existsSync(adminAuthFile)) {
        const raw = fs.readFileSync(adminAuthFile, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<StoredAdminCredentials>;
        if (
          typeof parsed.username === 'string' &&
          typeof parsed.passwordHash === 'string' &&
          parsed.username.length > 0 &&
          isValidScryptHashFormat(parsed.passwordHash)
        ) {
          return {
            configured: true,
            invalidHashConfig: false,
            source: 'file',
            username: parsed.username,
            passwordHash: parsed.passwordHash,
          };
        }
      }
    } catch {
      // Ignore unreadable credentials file
    }

    return {
      configured: false,
      invalidHashConfig: false,
      source: 'none',
      username: null,
      passwordHash: null,
    };
  }

  function signAdminToken(username: string): string {
    const now = Date.now();
    const payload: AdminTokenPayload = {
      sub: username,
      jti: crypto.randomUUID(),
      iat: now,
      exp: now + SESSION_TTL_MS,
    };
    const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const sig = crypto
      .createHmac('sha256', sessionSecret)
      .update(payloadB64)
      .digest('base64url');
    return `${payloadB64}.${sig}`;
  }

  function verifyAdminToken(token: string): AdminTokenPayload | null {
    const dotIdx = token.indexOf('.');
    if (dotIdx <= 0) return null;
    const payloadB64 = token.slice(0, dotIdx);
    const sigB64 = token.slice(dotIdx + 1);
    if (!payloadB64 || !sigB64) return null;

    const expectedSig = crypto
      .createHmac('sha256', sessionSecret)
      .update(payloadB64)
      .digest('base64url');

    const sigBuf = Buffer.from(sigB64, 'utf8');
    const expectedBuf = Buffer.from(expectedSig, 'utf8');
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    try {
      const payload = JSON.parse(
        Buffer.from(payloadB64, 'base64url').toString('utf8')
      ) as Partial<AdminTokenPayload>;
      if (
        typeof payload.sub !== 'string' ||
        typeof payload.jti !== 'string' ||
        typeof payload.iat !== 'number' ||
        typeof payload.exp !== 'number'
      ) {
        return null;
      }
      if (Date.now() > payload.exp) return null;
      if (revokedTokenJtis.has(payload.jti)) return null;

      const admin = getConfiguredAdmin();
      if (!admin.configured || !admin.username || !timingSafeTextEqual(payload.sub, admin.username)) {
        return null;
      }
      return payload as AdminTokenPayload;
    } catch {
      return null;
    }
  }

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

  function getActiveOnline(): number {
    const hour = new Date().getHours();
    return Math.floor(4 + Math.sin(hour / 3) * 3 + (Date.now() % 3));
  }

  // Sliding window rate limiter helper
  function createRateLimiter(windowMs: number, maxRequests: number) {
    const buckets = new Map<string, number[]>();
    return (ip: string): boolean => {
      const now = Date.now();
      const history = (buckets.get(ip) || []).filter((ts) => now - ts < windowMs);
      if (history.length >= maxRequests) {
        buckets.set(ip, history);
        return true;
      }
      history.push(now);
      buckets.set(ip, history);
      if (buckets.size > 500) {
        for (const [k, v] of buckets.entries()) {
          if (v.every((ts) => now - ts >= windowMs)) {
            buckets.delete(k);
          }
        }
      }
      return false;
    };
  }

  const isContactRateLimited = createRateLimiter(10 * 60 * 1000, 5);
  const isLoginRateLimited = createRateLimiter(10 * 60 * 1000, 10);

  function readContactMessages(): StoredContactMessage[] {
    try {
      if (!fs.existsSync(contactFile)) return [];
      const raw = fs.readFileSync(contactFile, 'utf-8');
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
        .map((item) => ({
          id: typeof item.id === 'string' && VALID_ID_REGEX.test(item.id)
            ? item.id
            : crypto.randomUUID(),
          name: typeof item.name === 'string' ? item.name : '',
          email: typeof item.email === 'string' ? item.email : '',
          message: typeof item.message === 'string' ? item.message : '',
          status: (item.status === 'read' ? 'read' : 'unread') as 'read' | 'unread',
          deliveredVia: (item.deliveredVia === 'email' ? 'email' : 'saved') as 'email' | 'saved',
          createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
          updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : null,
        }));
    } catch {
      return [];
    }
  }

  function writeContactMessages(entries: StoredContactMessage[]) {
    const bounded = entries.slice(-500);
    const tempFile = `${contactFile}.${crypto.randomUUID()}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(bounded, null, 2));
    fs.renameSync(tempFile, contactFile);
  }

  function extractBearerToken(req: express.Request): string | null {
    const authHeader = req.headers.authorization;
    if (!authHeader || typeof authHeader !== 'string') return null;
    if (!authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7).trim();
    return token.length > 0 ? token : null;
  }

  function requireAdminAuth(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    res.setHeader('Cache-Control', 'no-store');
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Authentication required.' });
    }
    const payload = verifyAdminToken(token);
    if (!payload) {
      return res.status(401).json({ ok: false, error: 'Invalid or expired admin session.' });
    }
    (req as express.Request & { adminSession?: AdminTokenPayload }).adminSession = payload;
    next();
  }

  // Public API Endpoints
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
    if (isContactRateLimited(clientIp)) {
      return res.status(429).json({
        ok: false,
        error: 'Too many messages sent. Please wait a few minutes before trying again.',
      });
    }

    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ ok: false, error: 'Invalid request payload.' });
    }

    const { id: requestedId, name, email, message, website, formLoadedAt } = body as Record<
      string,
      unknown
    >;

    if (typeof website === 'string' && website.trim().length > 0) {
      return res.status(400).json({ ok: false, error: 'Spam check failed.' });
    }

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
        // Fallback to server persistence if outbound email fails
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

  // Admin Authentication & Private Inbox Endpoints
  app.get('/api/admin/status', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const admin = getConfiguredAdmin();
    return res.json({
      ok: true,
      configured: admin.configured,
      invalidHashConfig: admin.invalidHashConfig,
      source: admin.source,
    });
  });

  app.post('/api/admin/setup', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const admin = getConfiguredAdmin();
    if (admin.invalidHashConfig) {
      return res.status(500).json({
        ok: false,
        code: 'INVALID_HASH_CONFIG',
        error: 'Server ADMIN_PASSWORD_HASH format is invalid. Use scrypt$salt$hash or set ADMIN_PASSWORD.',
      });
    }
    if (admin.configured) {
      return res.status(403).json({
        ok: false,
        code: 'ALREADY_CONFIGURED',
        error: 'Admin credentials are already configured.',
      });
    }

    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ ok: false, error: 'Invalid request payload.' });
    }

    const { username, password } = body as Record<string, unknown>;
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ ok: false, error: 'Username and password are required.' });
    }

    const cleanUsername = username.trim();
    if (!VALID_USERNAME_REGEX.test(cleanUsername)) {
      return res.status(400).json({
        ok: false,
        error: 'Username must be 3-64 characters (letters, numbers, ., _, -).',
      });
    }

    if (password.length < 4 || password.length > 128) {
      return res.status(400).json({
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
      // Atomic exclusive create prevents race condition setup takeover
      const fd = fs.openSync(adminAuthFile, 'wx', 0o600);
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
        return res.status(403).json({
          ok: false,
          code: 'ALREADY_CONFIGURED',
          error: 'Admin credentials are already configured.',
        });
      }
      return res.status(500).json({
        ok: false,
        error: 'Could not save admin credentials.',
      });
    }

    const token = signAdminToken(cleanUsername);
    return res.status(201).json({
      ok: true,
      token,
      username: cleanUsername,
    });
  });

  app.post('/api/admin/login', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (isLoginRateLimited(clientIp)) {
      return res.status(429).json({
        ok: false,
        code: 'RATE_LIMITED',
        error: 'Too many login attempts. Please wait a few minutes and try again.',
      });
    }

    const admin = getConfiguredAdmin();
    if (admin.invalidHashConfig) {
      return res.status(500).json({
        ok: false,
        code: 'INVALID_HASH_CONFIG',
        error: 'Server ADMIN_PASSWORD_HASH format is invalid. Use scrypt$salt$hash or set ADMIN_PASSWORD.',
      });
    }
    if (!admin.configured || !admin.username || !admin.passwordHash) {
      return res.status(412).json({
        ok: false,
        code: 'NOT_CONFIGURED',
        error: 'Admin account is not configured yet.',
      });
    }

    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ ok: false, error: 'Invalid login payload.' });
    }

    const { username, password } = body as Record<string, unknown>;
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ ok: false, error: 'Username and password are required.' });
    }

    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      return res.status(400).json({ ok: false, error: 'Username and password are required.' });
    }

    const usernameValid = timingSafeTextEqual(cleanUsername, admin.username);
    const passwordValid = verifyPasswordScrypt(password, admin.passwordHash);

    if (!usernameValid || !passwordValid) {
      return res.status(401).json({
        ok: false,
        code: 'INVALID_CREDENTIALS',
        error: 'Invalid username or password.',
      });
    }

    const token = signAdminToken(admin.username);
    return res.json({
      ok: true,
      token,
      username: admin.username,
    });
  });

  app.post('/api/admin/logout', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const token = extractBearerToken(req);
    if (token) {
      const payload = verifyAdminToken(token);
      if (payload) {
        revokedTokenJtis.add(payload.jti);
        if (revokedTokenJtis.size > 1000) {
          revokedTokenJtis.clear();
        }
      }
    }
    return res.json({ ok: true });
  });

  app.get('/api/admin/session', requireAdminAuth, (req, res) => {
    const session = (req as express.Request & { adminSession?: AdminTokenPayload }).adminSession;
    return res.json({
      ok: true,
      username: session?.sub || '',
    });
  });

  app.get('/api/admin/messages', requireAdminAuth, (req, res) => {
    const messages = readContactMessages().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return res.json({
      ok: true,
      messages,
    });
  });

  app.patch('/api/admin/messages/:id', requireAdminAuth, (req, res) => {
    const messageId = req.params.id;
    if (!VALID_ID_REGEX.test(messageId)) {
      return res.status(400).json({ ok: false, error: 'Invalid message ID.' });
    }

    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ ok: false, error: 'Invalid request payload.' });
    }

    const { status } = body as Record<string, unknown>;
    if (status !== 'read' && status !== 'unread') {
      return res.status(400).json({ ok: false, error: 'Status must be read or unread.' });
    }

    const existing = readContactMessages();
    const idx = existing.findIndex((m) => m.id === messageId);
    if (idx === -1) {
      return res.status(404).json({ ok: false, error: 'Message not found.' });
    }

    const updated: StoredContactMessage = {
      ...existing[idx],
      status,
      updatedAt: new Date().toISOString(),
    };
    existing[idx] = updated;
    writeContactMessages(existing);

    return res.json({
      ok: true,
      message: updated,
    });
  });

  app.delete('/api/admin/messages/:id', requireAdminAuth, (req, res) => {
    const messageId = req.params.id;
    if (!VALID_ID_REGEX.test(messageId)) {
      return res.status(400).json({ ok: false, error: 'Invalid message ID.' });
    }

    const existing = readContactMessages();
    const filtered = existing.filter((m) => m.id !== messageId);
    if (filtered.length === existing.length) {
      return res.status(404).json({ ok: false, error: 'Message not found.' });
    }

    writeContactMessages(filtered);
    return res.json({ ok: true });
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
