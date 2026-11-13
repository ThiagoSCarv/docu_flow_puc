import type { BackupRepository } from '../../domain/backup/backup.repository.js'
import { mapPage, type Page, type PageRequest } from '../../shared/utils/pagination.js'
import { type BackupDto, toBackupDto } from './backup.dto.js'

export class ListBackupsUseCase {
  constructor(private readonly backups: BackupRepository) {}

  async execute(page: PageRequest): Promise<Page<BackupDto>> {
    const history = await this.backups.findHistory(page)
    return mapPage(history, ({ backup, responsibleName }) => toBackupDto(backup, responsibleName))
  }
}
