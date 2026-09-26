import { createHash, randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Db } from './db.js';
import { forbidden, unauthorized } from './errors.js';

export interface AuthUser {
  id: string;
  email: string;
  role: 'player' | 'admin';
  status: 'active' | 'suspended';
  sessionId: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

// Argon2id with OWASP-recommended parameters (19 MiB, 2 iterations).
const ARGON = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const hashPassword = (password: string) => hash(password, ARGON);
export const verifyPassword = (hashed: string, password: string) =>
  verify(hashed, password).catch(() => false);

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(
  db: Db,
  userId: string,
  ttlDays: number,
  meta: { ip?: string; userAgent?: string },
) {
  const token = `cz_${randomBytes(32).toString('base64url')}`;
  await db.query(
    `INSERT INTO sessions (user_id, token_hash, ip, user_agent, expires_at) VALUES ($1, $2, $3, $4, now() + ($5 || ' days')::interval)`,
    [userId, hashToken(token), meta.ip ?? null, meta.userAgent?.slice(0, 300) ?? null, String(ttlDays)],
  );
  return token;
}

export async function resolveSession(db: Db, token: string | undefined): Promise<AuthUser | null> {
  if (!token || !token.startsWith('cz_') || token.length > 100) return null;
  const r = await db.query<{
    session_id: string;
    id: string;
    email: string;
    role: AuthUser['role'];
    status: AuthUser['status'];
  }>(
    `UPDATE sessions s SET last_seen_at = now()
       FROM users u
      WHERE s.token_hash = $1 AND s.expires_at > now() AND u.id = s.user_id
      RETURNING s.id AS session_id, u.id, u.email, u.role, u.status`,
    [hashToken(token)],
  );
  const row = r.rows[0];
  if (!row) return null;
  return { id: row.id, email: row.email, role: row.role, status: row.status, sessionId: row.session_id };
}

export function bearer(req: FastifyRequest): string | undefined {
  const h = req.headers.authorization;
  if (h?.startsWith('Bearer ')) return h.slice(7).trim();
  return undefined;
}

export function requireUser(req: FastifyRequest): AuthUser {
  if (!req.user) throw unauthorized();
  if (req.user.status === 'suspended')
    throw forbidden('This account is suspended. Contact support if you think this is a mistake.');
  return req.user;
}

export function requireAdmin(req: FastifyRequest): AuthUser {
  const user = requireUser(req);
  if (user.role !== 'admin') throw forbidden('Admin access required.');
  return user;
}

export function authHook(db: Db) {
  return async (req: FastifyRequest, _reply: FastifyReply) => {
    const user = await resolveSession(db, bearer(req));
    if (user) req.user = user;
  };
}
