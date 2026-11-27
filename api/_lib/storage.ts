import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const VALID_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

export interface StoredContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  status: 'unread' | 'read';
  deliveredVia: 'email' | 'saved';
  createdAt: string;
  updatedAt: string | null;
}

export function getDataDir(): string {
  const baseDir = process.env.VERCEL
    ? path.join('/tmp', 'jubayer_data')
    : path.resolve(process.cwd(), 'data');

  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  return baseDir;
}

export function getCounterFilePath(): string {
  return path.join(getDataDir(), 'visitors.json');
}

export function getContactFilePath(): string {
  return path.join(getDataDir(), 'contact_messages.json');
}

export function getAdminAuthFilePath(): string {
  return path.join(getDataDir(), 'admin_credentials.json');
}

const BASELINE_COUNT = 3480;

export function getVisitorCount(): number {
  try {
    const file = getCounterFilePath();
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf-8');
      const parsed = JSON.parse(raw);
      if (typeof parsed.count === 'number' && parsed.count >= BASELINE_COUNT) {
        return parsed.count;
      }
    }
  } catch {
    // Ignore read error
  }
  return BASELINE_COUNT;
}

export function saveVisitorCount(count: number): void {
  try {
    const file = getCounterFilePath();
    fs.writeFileSync(
      file,
      JSON.stringify({ count, lastUpdated: new Date().toISOString() }, null, 2)
    );
  } catch {
    // Ignore storage error on read-only environments
  }
}

export function getActiveOnline(): number {
  const hour = new Date().getHours();
  return Math.floor(4 + Math.sin(hour / 3) * 3 + (Date.now() % 3));
}

export function readContactMessages(): StoredContactMessage[] {
  try {
    const file = getContactFilePath();
    if (!fs.existsSync(file)) return [];
    const raw = fs.readFileSync(file, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
      .map((item) => ({
        id:
          typeof item.id === 'string' && VALID_ID_REGEX.test(item.id)
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

export function writeContactMessages(entries: StoredContactMessage[]): void {
  const file = getContactFilePath();
  const bounded = entries.slice(-500);
  const tempFile = `${file}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(bounded, null, 2));
  fs.renameSync(tempFile, file);
}
