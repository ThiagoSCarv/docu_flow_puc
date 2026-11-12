import { desc, eq } from 'drizzle-orm'
import { Backup } from '../../../domain/backup/backup.entity.js'
import type {
  BackupHistoryEntry,
  BackupRepository,
} from '../../../domain/backup/backup.repository.js'
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

  async findHistory(): Promise<BackupHistoryEntry[]> {
    const rows = await this.db
      .select({ backup: backups, responsibleName: users.name })
      .from(backups)
      .innerJoin(users, eq(backups.responsibleId, users.id))
      .orderBy(desc(backups.performedAt))
    return rows.map(({ backup, responsibleName }) => ({
      backup: Backup.restore(backup),
      responsibleName,
    }))
  }
}
