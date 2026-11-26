import type {
  ActivityLogCriteria,
  ActivityLogRecord,
  ActivityLogRepository,
} from '../../domain/audit/activity-log.repository.js'
import type { Page, PageRequest } from '../../shared/utils/pagination.js'

export type ListActivityLogsInput = ActivityLogCriteria & { page: PageRequest }

export class ListActivityLogsUseCase {
  constructor(private readonly activityLog: ActivityLogRepository) {}

  execute({ page, ...criteria }: ListActivityLogsInput): Promise<Page<ActivityLogRecord>> {
    return this.activityLog.list(criteria, page)
  }
}
