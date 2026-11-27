import fs from 'fs';
import crypto from 'crypto';
import { getAdminAuthFilePath } from './storage.js';
import { ApiRequest, extractSessionToken } from './http.js';

export const VALID_USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,64}$/;
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export interface StoredAdminCredentials {
  username: string;
  passwordHash: string;
  createdAt: string;
}

export interface AdminTokenPayload {
  sub: string;
  jti: string;
  iat: number;
  exp: number;
}

const fallbackSessionSecret = crypto.randomBytes(32).toString('hex');
const revokedTokenJtis = new Set<string>();

let cachedPlainSource: string | null = null;
let cachedPlainHash: string | null = null;

function getSessionSecret(): string {
  const envSecret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (envSecret && envSecret.length >= 16) {
    return envSecret;
  }
  return fallbackSessionSecret;
}

export function hasMissingServerlessSessionSecret(): boolean {
  if (!process.env.VERCEL) return false;
  const envSecret = process.env.ADMIN_SESSION_SECRET?.trim();
  return !envSecret || envSecret.length < 16;
}

export function timingSafeTextEqual(a: string, b: string): boolean {
  const key = crypto.randomBytes(32);
  const digestA = crypto.createHmac('sha256', key).update(a, 'utf8').digest();
  const digestB = crypto.createHmac('sha256', key).update(b, 'utf8').digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

export function isValidScryptHashFormat(storedHash: string): boolean {
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

export function hashPasswordScrypt(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPasswordScrypt(password: string, storedHash: string): boolean {
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

export function getConfiguredAdmin(): {
  configured: boolean;
  invalidHashConfig: boolean;
  missingSessionSecret: boolean;
  source: 'env' | 'file' | 'none';
  username: string | null;
  passwordHash: string | null;
} {
  const missingSessionSecret = hasMissingServerlessSessionSecret();
  const envUsername = process.env.ADMIN_USERNAME?.trim();
  const rawEnvHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  const envPlainPassword = process.env.ADMIN_PASSWORD;

  if (envUsername && rawEnvHash) {
    if (!isValidScryptHashFormat(rawEnvHash)) {
      return {
        configured: false,
        invalidHashConfig: true,
        missingSessionSecret,
        source: 'env',
        username: envUsername,
        passwordHash: null,
      };
    }
    return {
      configured: true,
      invalidHashConfig: false,
      missingSessionSecret,
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
      missingSessionSecret,
      source: 'env',
      username: envUsername,
      passwordHash: cachedPlainHash,
    };
  }

  try {
    const adminAuthFile = getAdminAuthFilePath();
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
          missingSessionSecret,
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
    missingSessionSecret,
    source: 'none',
    username: null,
    passwordHash: null,
  };
}

export function signAdminToken(username: string): string {
  const now = Date.now();
  const payload: AdminTokenPayload = {
    sub: username,
    jti: crypto.randomUUID(),
    iat: now,
    exp: now + SESSION_TTL_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  const dotIdx = token.indexOf('.');
  if (dotIdx <= 0) return null;
  const payloadB64 = token.slice(0, dotIdx);
  const sigB64 = token.slice(dotIdx + 1);
  if (!payloadB64 || !sigB64) return null;

  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
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

export function revokeAdminToken(token: string): void {
  const payload = verifyAdminToken(token);
  if (!payload) return;
  revokedTokenJtis.add(payload.jti);
  if (revokedTokenJtis.size > 1000) {
    revokedTokenJtis.clear();
  }
}

export function authenticateAdminRequest(req: ApiRequest): AdminTokenPayload | null {
  const token = extractSessionToken(req);
  if (!token) return null;
  return verifyAdminToken(token);
}

export function createRateLimiter(windowMs: number, maxRequests: number) {
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
