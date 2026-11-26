import { beforeEach, describe, expect, it } from 'vitest'
import { GetDashboardUseCase } from '../../../src/application/dashboard/get-dashboard.use-case.js'
import { Backup } from '../../../src/domain/backup/backup.entity.js'
import { Client } from '../../../src/domain/catalog/client.entity.js'
import { Document } from '../../../src/domain/catalog/document.entity.js'
import { DocumentName } from '../../../src/domain/catalog/document-name.value-object.js'
import { Period } from '../../../src/domain/catalog/period.value-object.js'
import { BackupStatus, UserRole } from '../../../src/shared/utils/enums.js'
import {
  FixedClock,
  InMemoryBackupRepository,
  InMemoryClientRepository,
  InMemoryDocumentRepository,
} from '../../helpers/fakes.js'

const FISCAIS = 'cat-fiscais'
const CONTABEIS = 'cat-contabeis'
const ADMIN_ID = 'admin-id'
const clock = new FixedClock()

describe('GetDashboardUseCase (RF29)', () => {
  let documents: InMemoryDocumentRepository
  let backups: InMemoryBackupRepository
  let useCase: GetDashboardUseCase

  const saveDocument = (categoryId: string, description: string) =>
    documents.save(
      Document.create(
        {
          name: DocumentName.create({
            clientCode: 'CLI-A',
            categoryCode: categoryId,
            period: Period.create('2026-10'),
            description,
          }),
          description,
          period: Period.create('2026-10'),
          cloudLocation: 'https://nuvem.exemplo.com/arquivo',
          clientId: 'cliente-a',
          categoryId,
          createdBy: ADMIN_ID,
        },
        clock.now(),
      ),
    )

  const saveBackup = (performedAt: string, status: BackupStatus) =>
    backups.save(
      Backup.create(
        { performedAt: new Date(performedAt), status, scope: 'Drive', responsibleId: ADMIN_ID },
        clock.now(),
      ),
    )

  beforeEach(async () => {
    documents = new InMemoryDocumentRepository()
    backups = new InMemoryBackupRepository(new Map([[ADMIN_ID, 'Admin']]))
    const inactive = Client.create({ name: 'Cliente B', code: 'CLI-B' }, clock.now())
    inactive.deactivate()
    const clients = new InMemoryClientRepository([
      Client.create({ name: 'Cliente A', code: 'CLI-A' }, clock.now()),
      inactive,
    ])
    useCase = new GetDashboardUseCase(documents, clients, backups)

    await saveDocument(FISCAIS, 'guia icms')
    await saveDocument(FISCAIS, 'guia iss')
    await saveDocument(CONTABEIS, 'balanco')
    await saveBackup('2026-11-01T10:00:00Z', BackupStatus.VERIFICADO)
    await saveBackup('2026-11-02T10:00:00Z', BackupStatus.REALIZADO)
  })

  it('ADMIN vê o total de todas as categorias, clientes e backups', async () => {
    const dashboard = await useCase.execute({ role: UserRole.ADMIN, allowedCategoryIds: [] })

    expect(dashboard.documents.total).toBe(3)
    expect(dashboard.clients).toEqual({ active: 1, inactive: 1 })
    expect(dashboard.backups.pendingVerification).toBe(1)
    expect(dashboard.backups.latest).toMatchObject({
      status: BackupStatus.REALIZADO,
      responsible: { name: 'Admin' },
    })
  })

  it('FUNCIONARIO só conta documentos das categorias permitidas', async () => {
    const dashboard = await useCase.execute({
      role: UserRole.FUNCIONARIO,
      allowedCategoryIds: [FISCAIS],
    })

    expect(dashboard.documents).toEqual({
      total: 2,
      byCategory: [{ categoryId: FISCAIS, total: 2 }],
    })
  })

  it('usuário sem categorias vê zero documentos', async () => {
    const dashboard = await useCase.execute({ role: UserRole.CONSULTA, allowedCategoryIds: [] })

    expect(dashboard.documents).toEqual({ total: 0, byCategory: [] })
  })
})
