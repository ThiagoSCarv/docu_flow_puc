import type { Backup } from './backup.entity.js'

export type BackupHistoryEntry = {
  backup: Backup
  responsibleName: string
}

export interface BackupRepository {
  save(backup: Backup): Promise<void>
  findHistory(): Promise<BackupHistoryEntry[]>
}
