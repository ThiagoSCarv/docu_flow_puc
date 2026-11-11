import { activityLogs } from '../db/schema.js'
import type { Database } from '../db/types.js'

export type ActivityAction = 'LOGIN_SUCESSO' | 'LOGIN_FALHA' | 'LOGIN_BLOQUEADO' | 'USUARIO_CRIADO'

export type ActivityEntry = {
  userId: string | null
  action: ActivityAction
  entity?: string
  entityId?: string
  ip?: string
}

export async function logActivity(db: Database, entry: ActivityEntry) {
  await db.insert(activityLogs).values(entry)
}
