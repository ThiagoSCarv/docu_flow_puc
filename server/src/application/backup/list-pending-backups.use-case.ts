// Camada de aplicação: caso de uso dos backups pendentes de verificação (RF25).
import type { BackupRepository } from '../../domain/backup/backup.repository.js'
import { mapPage, type Page, type PageRequest } from '../../shared/utils/pagination.js'
import { type BackupDto, toBackupDto } from './backup.dto.js'

// Lista os backups que ainda precisam ser conferidos, para o escritório acompanhar.
export class ListPendingBackupsUseCase {
  constructor(private readonly backups: BackupRepository) {}

  // Busca uma página dos pendentes e converte cada item em DTO.
  async execute(page: PageRequest): Promise<Page<BackupDto>> {
    const pending = await this.backups.findPendingVerification(page)
    return mapPage(pending, ({ backup, responsibleName }) => toBackupDto(backup, responsibleName))
  }
}
