// Domínio (backup): contrato do repositório de registros de backup (RF22–RF25).
import type { Page, PageRequest } from '../../shared/utils/pagination.js'
import type { Backup } from './backup.entity.js'

// Item do histórico: o backup acompanhado do nome do responsável, para exibição.
export type BackupHistoryEntry = {
  backup: Backup
  responsibleName: string
}

// Porta implementada na infra: grava registros e consulta histórico e pendências.
export interface BackupRepository {
  save(backup: Backup): Promise<void>
  findHistory(page: PageRequest): Promise<Page<BackupHistoryEntry>>
  // REALIZADO posterior ao VERIFICADO mais recente; FALHOU não conta (RF25).
  findPendingVerification(page: PageRequest): Promise<Page<BackupHistoryEntry>>
}
