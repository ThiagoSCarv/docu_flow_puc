import type { BackupRepository } from '../../domain/backup/backup.repository.js'
import { type BackupDto, toBackupDto } from './backup.dto.js'

export class ListBackupsUseCase {
  constructor(private readonly backups: BackupRepository) {}

  async execute(): Promise<BackupDto[]> {
    const history = await this.backups.findHistory()
    return history.map(({ backup, responsibleName }) => toBackupDto(backup, responsibleName))
  }
}
