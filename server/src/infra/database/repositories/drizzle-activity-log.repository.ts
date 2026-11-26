// Infra: repositório Drizzle do log de atividades, gravação e consulta paginada (RF26, RF27).
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

  // Grava uma ação relevante (login, criação, mudança de permissão).
  async record(entry: ActivityLogEntry): Promise<void> {
    await this.db.insert(activityLogs).values(entry)
  }

  // Lista do mais recente ao mais antigo, filtrando por ação e usuário, com o total para paginar.
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
    // leftJoin porque o usuário pode ter sido removido; nesse caso o autor vira null.
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
