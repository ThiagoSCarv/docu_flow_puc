import type {
  ActivityLogEntry,
  ActivityLogRepository,
} from '../../../domain/audit/activity-log.repository.js'
import { activityLogs } from '../schema.js'
import type { Database } from '../types.js'

export class DrizzleActivityLogRepository implements ActivityLogRepository {
  constructor(private readonly db: Database) {}

  async record(entry: ActivityLogEntry): Promise<void> {
    await this.db.insert(activityLogs).values(entry)
  }
}
