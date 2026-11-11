import type { ActivityAction, ActivityEntity } from '../../shared/utils/enums.js'

export type ActivityLogEntry = {
  userId: string | null
  action: ActivityAction
  entity?: ActivityEntity
  entityId?: string
  ip?: string
}

export interface ActivityLogRepository {
  record(entry: ActivityLogEntry): Promise<void>
}
