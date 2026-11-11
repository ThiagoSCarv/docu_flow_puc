import type { ActivityAction } from '../../shared/utils/enums.js'

export type ActivityLogEntry = {
  userId: string | null
  action: ActivityAction
  entity?: string
  entityId?: string
  ip?: string
}

export interface ActivityLogRepository {
  record(entry: ActivityLogEntry): Promise<void>
}
