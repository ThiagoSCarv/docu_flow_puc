import { and, count, desc, eq, gt, max, type SQL } from 'drizzle-orm'
import { Backup } from '../../../domain/backup/backup.entity.js'
import type {
  BackupHistoryEntry,
  BackupRepository,
} from '../../../domain/backup/backup.repository.js'
import { BackupStatus } from '../../../shared/utils/enums.js'
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
    return this.findWhere(undefined, page)
  }

  async findPendingVerification(page: PageRequest): Promise<Page<BackupHistoryEntry>> {
    const [{ lastVerifiedAt }] = await this.db
      .select({ lastVerifiedAt: max(backups.performedAt) })
      .from(backups)
      .where(eq(backups.status, BackupStatus.VERIFICADO))
    const where = and(
      eq(backups.status, BackupStatus.REALIZADO),
      lastVerifiedAt ? gt(backups.performedAt, lastVerifiedAt) : undefined,
    )
    return this.findWhere(where, page)
  }

  private async findWhere(
    where: SQL | undefined,
    page: PageRequest,
  ): Promise<Page<BackupHistoryEntry>> {
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({ backup: backups, responsibleName: users.name })
        .from(backups)
        .innerJoin(users, eq(backups.responsibleId, users.id))
        .where(where)
        .orderBy(desc(backups.performedAt), desc(backups.id))
        .limit(page.limit)
        .offset(page.offset),
      this.db.select({ total: count() }).from(backups).where(where),
    ])
    const items = rows.map(({ backup, responsibleName }) => ({
      backup: Backup.restore(backup),
      responsibleName,
    }))
    return { items, total }
  }
}
