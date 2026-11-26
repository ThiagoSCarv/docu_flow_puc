// Domínio (audit): contrato do repositório do log de atividades (RF26, RF27).
import type { ActivityAction, ActivityEntity } from '../../shared/utils/enums.js'
import type { Page, PageRequest } from '../../shared/utils/pagination.js'

// Dados para registrar uma ação; userId nulo cobre tentativas de login sem usuário conhecido.
export type ActivityLogEntry = {
  userId: string | null
  action: ActivityAction
  entity?: ActivityEntity
  entityId?: string
  ip?: string
}

// Registro lido do log, com o nome de quem agiu (nulo se o usuário foi apagado) (RF27).
export type ActivityLogRecord = {
  id: string
  action: ActivityAction
  entity: ActivityEntity | null
  entityId: string | null
  ip: string | null
  createdAt: Date
  user: { id: string; name: string } | null
}

// Filtros opcionais da consulta do log, por ação e por usuário.
export type ActivityLogCriteria = {
  action?: ActivityAction
  userId?: string
}

// Porta implementada na infra: grava ações relevantes e lista o histórico paginado.
export interface ActivityLogRepository {
  record(entry: ActivityLogEntry): Promise<void>
  list(criteria: ActivityLogCriteria, page: PageRequest): Promise<Page<ActivityLogRecord>>
}
