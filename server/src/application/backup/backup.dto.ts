// Camada de aplicação: DTO de saída dos registros de backup (RF22–RF24).
import type { Backup } from '../../domain/backup/backup.entity.js'
import type { BackupStatus } from '../../shared/utils/enums.js'

// Formato exposto à camada HTTP, com o responsável resumido a id e nome (RNF10).
export type BackupDto = {
  id: string
  performedAt: Date
  status: BackupStatus
  scope: string
  notes: string | null
  responsible: { id: string; name: string }
}

// Converte a entidade em DTO para não expor a entidade fora da aplicação.
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
