import type { Backup } from '../../domain/backup/backup.entity.js'
import type { BackupStatus } from '../../shared/utils/enums.js'

export type BackupDto = {
  id: string
  performedAt: Date
  status: BackupStatus
  scope: string
  notes: string | null
  responsible: { id: string; name: string }
}

export function toBackupDto(backup: Backup, responsibleName: string): BackupDto {
  return {
    id: backup.id,
    performedAt: backup.performedAt,
    status: backup.status,
    scope: backup.scope,
    notes: backup.notes,
    responsible: { id: backup.responsibleId, name: responsibleName },
  }
}
