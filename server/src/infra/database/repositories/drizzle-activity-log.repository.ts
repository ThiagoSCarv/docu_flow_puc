import { and, count, desc, eq } from 'drizzle-orm'
import type {
  ActivityLogCriteria,
  ActivityLogEntry,
  ActivityLogRecord,
  ActivityLogRepository,
} from '../../../domain/audit/activity-log.repository.js'
import type { Page, PageRequest } from '../../../shared/utils/pagination.js'
import { activityLogs, users } from '../schema.js'
import type { Database } from '../types.js'

export class DrizzleActivityLogRepository implements ActivityLogRepository {
  constructor(private readonly db: Database) {}

  async record(entry: ActivityLogEntry): Promise<void> {
    await this.db.insert(activityLogs).values(entry)
  }

  async list(
    { action, userId }: ActivityLogCriteria,
    page: PageRequest,
  ): Promise<Page<ActivityLogRecord>> {
    const where = and(
      action ? eq(activityLogs.action, action) : undefined,
      userId ? eq(activityLogs.userId, userId) : undefined,
    )
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({ log: activityLogs, userName: users.name })
        .from(activityLogs)
        .leftJoin(users, eq(activityLogs.userId, users.id))
        .where(where)
        .orderBy(desc(activityLogs.createdAt), desc(activityLogs.id))
        .limit(page.limit)
        .offset(page.offset),
      this.db.select({ total: count() }).from(activityLogs).where(where),
    ])
    const items = rows.map(({ log, userName }) => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      ip: log.ip,
      createdAt: log.createdAt,
      user: log.userId && userName !== null ? { id: log.userId, name: userName } : null,
    }))
    return { items, total }
  }
}
