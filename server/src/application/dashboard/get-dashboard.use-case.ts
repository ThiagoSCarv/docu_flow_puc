// Camada de aplicação: painel de indicadores de documentos, clientes e backups (RF29).
import type { BackupRepository } from '../../domain/backup/backup.repository.js'
import {
  type CatalogActor,
  viewableCategories,
} from '../../domain/catalog/category-access.policy.js'
import type { ClientRepository } from '../../domain/catalog/client.repository.js'
import type { DocumentRepository } from '../../domain/catalog/document.repository.js'
import { type BackupDto, toBackupDto } from '../backup/backup.dto.js'

// Totais exibidos no painel, com o último backup registrado ou null.
export type DashboardDto = {
  documents: { total: number; byCategory: { categoryId: string; total: number }[] }
  clients: { active: number; inactive: number }
  backups: { pendingVerification: number; latest: BackupDto | null }
}

// Página de um item: basta para ler o total e o registro mais recente.
const FIRST_ITEM = { limit: 1, offset: 0 }

// Reúne os indicadores de três contextos, respeitando as categorias visíveis ao ator.
export class GetDashboardUseCase {
  constructor(
    private readonly documents: DocumentRepository,
    private readonly clients: ClientRepository,
    private readonly backups: BackupRepository,
  ) {}

  // Faz as consultas em paralelo e soma os documentos por categoria para o total geral.
  async execute(actor: CatalogActor): Promise<DashboardDto> {
    const [byCategory, clients, pending, history] = await Promise.all([
      this.countVisibleDocuments(actor),
      this.clients.countByStatus(),
      this.backups.findPendingVerification(FIRST_ITEM),
      this.backups.findHistory(FIRST_ITEM),
    ])
    const [latest] = history.items

    return {
      documents: { total: byCategory.reduce((sum, item) => sum + item.total, 0), byCategory },
      clients,
      backups: {
        pendingVerification: pending.total,
        latest: latest ? toBackupDto(latest.backup, latest.responsibleName) : null,
      },
    }
  }

  // Conta só documentos das categorias visíveis; sem nenhuma, nem consulta o banco.
  private async countVisibleDocuments(actor: CatalogActor) {
    const scope = viewableCategories(actor)
    if (scope !== 'ALL' && scope.length === 0) return []
    return this.documents.countByCategory(scope)
  }
}
