import type { ActivityAction, ActivityEntity } from '../../shared/utils/enums.js'
import type { Page, PageRequest } from '../../shared/utils/pagination.js'

export type ActivityLogEntry = {
  userId: string | null
  action: ActivityAction
  entity?: ActivityEntity
  entityId?: string
  ip?: string
}

export type ActivityLogRecord = {
  id: string
  action: ActivityAction
  entity: ActivityEntity | null
  entityId: string | null
  ip: string | null
  createdAt: Date
  user: { id: string; name: string } | null
}

export type ActivityLogCriteria = {
  action?: ActivityAction
  userId?: string
}

export interface ActivityLogRepository {
  record(entry: ActivityLogEntry): Promise<void>
  list(criteria: ActivityLogCriteria, page: PageRequest): Promise<Page<ActivityLogRecord>>
}
