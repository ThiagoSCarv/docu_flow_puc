import bcrypt from 'bcryptjs'
import { eq, sql } from 'drizzle-orm'
import { users } from '../db/schema.js'
import type { Database } from '../db/types.js'
import { logActivity } from './activity-log.js'

export const MAX_FAILED_ATTEMPTS = 5
export const LOCK_DURATION_MS = 15 * 60 * 1000
export const BCRYPT_ROUNDS = 10

const DUMMY_HASH = bcrypt.hashSync('senha-ficticia-para-tempo-constante', BCRYPT_ROUNDS)

export function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export type LoginResult =
  | { status: 'ok'; userId: string }
  | { status: 'invalid' }
  | { status: 'locked' }

export async function login(
  db: Database,
  credentials: { email: string; password: string },
  ip: string,
): Promise<LoginResult> {
  const email = credentials.email.toLowerCase()
  const [user] = await db.select().from(users).where(eq(users.email, email))

  const passwordMatches = await bcrypt.compare(
    credentials.password,
    user?.passwordHash ?? DUMMY_HASH,
  )

  if (!user) {
    await logActivity(db, { userId: null, action: 'LOGIN_FALHA', ip })
    return { status: 'invalid' }
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await logActivity(db, { userId: user.id, action: 'LOGIN_BLOQUEADO', ip })
    return { status: 'locked' }
  }

  if (!user.active) {
    await logActivity(db, { userId: user.id, action: 'LOGIN_FALHA', ip })
    return { status: 'invalid' }
  }

  if (!passwordMatches) {
    return registerFailure(db, user.id, ip)
  }

  await db
    .update(users)
    .set({ failedLoginAttempts: 0, lockedUntil: null })
    .where(eq(users.id, user.id))
  await logActivity(db, { userId: user.id, action: 'LOGIN_SUCESSO', ip })
  return { status: 'ok', userId: user.id }
}

async function registerFailure(db: Database, userId: string, ip: string): Promise<LoginResult> {
  const [{ failedLoginAttempts }] = await db
    .update(users)
    .set({ failedLoginAttempts: sql`${users.failedLoginAttempts} + 1` })
    .where(eq(users.id, userId))
    .returning({ failedLoginAttempts: users.failedLoginAttempts })

  if (failedLoginAttempts < MAX_FAILED_ATTEMPTS) {
    await logActivity(db, { userId, action: 'LOGIN_FALHA', ip })
    return { status: 'invalid' }
  }

  await db
    .update(users)
    .set({ failedLoginAttempts: 0, lockedUntil: new Date(Date.now() + LOCK_DURATION_MS) })
    .where(eq(users.id, userId))
  await logActivity(db, { userId, action: 'LOGIN_BLOQUEADO', ip })
  return { status: 'locked' }
}
