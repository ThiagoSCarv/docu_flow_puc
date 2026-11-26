// Camada de aplicação: caso de uso que consulta o log de atividades com filtros (RF27).
import type {
  ActivityLogCriteria,
  ActivityLogRecord,
  ActivityLogRepository,
} from '../../domain/audit/activity-log.repository.js'
import type { Page, PageRequest } from '../../shared/utils/pagination.js'

// Entrada da consulta: filtros do log mais a página solicitada.
export type ListActivityLogsInput = ActivityLogCriteria & { page: PageRequest }

// Lista os registros do log paginados, sem registrar a própria consulta (só leitura).
export class ListActivityLogsUseCase {
  constructor(private readonly activityLog: ActivityLogRepository) {}

  // Separa a paginação dos critérios e delega a busca ao repositório do contexto audit.
  execute({ page, ...criteria }: ListActivityLogsInput): Promise<Page<ActivityLogRecord>> {
    return this.activityLog.list(criteria, page)
  }
}
