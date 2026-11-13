import { count, desc, eq } from 'drizzle-orm'
import { Backup } from '../../../domain/backup/backup.entity.js'
import type {
  BackupHistoryEntry,
  BackupRepository,
} from '../../../domain/backup/backup.repository.js'
import type { Page, PageRequest } from '../../../shared/utils/pagination.js'
import { backups, users } from '../schema.js'
import type { Database } from '../types.js'

export class DrizzleBackupRepository implements BackupRepository {
  constructor(private readonly db: Database) {}

  async save(backup: Backup): Promise<void> {
    await this.db.insert(backups).values({
      id: backup.id,
      performedAt: backup.performedAt,
      status: backup.status,
      scope: backup.scope,
      notes: backup.notes,
      responsibleId: backup.responsibleId,
    })
  }

  async findHistory(page: PageRequest): Promise<Page<BackupHistoryEntry>> {
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({ backup: backups, responsibleName: users.name })
        .from(backups)
        .innerJoin(users, eq(backups.responsibleId, users.id))
        .orderBy(desc(backups.performedAt), desc(backups.id))
        .limit(page.limit)
        .offset(page.offset),
      this.db.select({ total: count() }).from(backups),
    ])
    const items = rows.map(({ backup, responsibleName }) => ({
      backup: Backup.restore(backup),
      responsibleName,
    }))
    return { items, total }
  }
}
