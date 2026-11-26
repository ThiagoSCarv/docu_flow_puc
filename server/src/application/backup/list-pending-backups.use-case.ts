import type { BackupRepository } from '../../domain/backup/backup.repository.js'
import { mapPage, type Page, type PageRequest } from '../../shared/utils/pagination.js'
import { type BackupDto, toBackupDto } from './backup.dto.js'

export class ListPendingBackupsUseCase {
  constructor(private readonly backups: BackupRepository) {}

  async execute(page: PageRequest): Promise<Page<BackupDto>> {
    const pending = await this.backups.findPendingVerification(page)
    return mapPage(pending, ({ backup, responsibleName }) => toBackupDto(backup, responsibleName))
  }
}
