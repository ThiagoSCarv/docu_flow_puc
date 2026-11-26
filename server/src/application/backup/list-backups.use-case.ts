// Camada de aplicação: caso de uso que consulta o histórico de backups (RF24).
import type { BackupRepository } from '../../domain/backup/backup.repository.js'
import { mapPage, type Page, type PageRequest } from '../../shared/utils/pagination.js'
import { type BackupDto, toBackupDto } from './backup.dto.js'

// Lista os backups registrados, paginados, com o nome do responsável.
export class ListBackupsUseCase {
  constructor(private readonly backups: BackupRepository) {}

  // Busca uma página do histórico e converte cada item em DTO.
  async execute(page: PageRequest): Promise<Page<BackupDto>> {
    const history = await this.backups.findHistory(page)
    return mapPage(history, ({ backup, responsibleName }) => toBackupDto(backup, responsibleName))
  }
}
