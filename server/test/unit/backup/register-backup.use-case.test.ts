import { beforeEach, describe, expect, it } from 'vitest'
import {
  type RegisterBackupInput,
  RegisterBackupUseCase,
} from '../../../src/application/backup/register-backup.use-case.js'
import { BackupInFutureError } from '../../../src/domain/backup/backup.errors.js'
import { ActivityAction, ActivityEntity, BackupStatus } from '../../../src/shared/utils/enums.js'
import {
  FixedClock,
  InMemoryActivityLogRepository,
  InMemoryBackupRepository,
} from '../../helpers/fakes.js'

const ADMIN = { userId: 'admin-id', name: 'Administrador', ip: '127.0.0.1' }

describe('RegisterBackupUseCase', () => {
  let backups: InMemoryBackupRepository
  let activityLog: InMemoryActivityLogRepository
  let useCase: RegisterBackupUseCase

  const input = (overrides: Partial<RegisterBackupInput> = {}): RegisterBackupInput => ({
    performedAt: new Date('2026-11-10T22:00:00Z'),
    status: BackupStatus.REALIZADO,
    scope: 'Pasta Clientes no Google Drive',
    notes: 'Backup semanal',
    actor: ADMIN,
    ...overrides,
  })

  beforeEach(() => {
    backups = new InMemoryBackupRepository()
    activityLog = new InMemoryActivityLogRepository()
    useCase = new RegisterBackupUseCase(backups, activityLog, new FixedClock())
  })

  it('devolve o backup com quem registrou como responsável', async () => {
    const registered = await useCase.execute(input())
    expect(registered).toMatchObject({
      performedAt: new Date('2026-11-10T22:00:00Z'),
      status: BackupStatus.REALIZADO,
      scope: 'Pasta Clientes no Google Drive',
      notes: 'Backup semanal',
      responsible: { id: ADMIN.userId, name: ADMIN.name },
    })
  })

  it('grava o backup no histórico', async () => {
    const registered = await useCase.execute(input())
    expect(backups.items.map((backup) => backup.id)).toEqual([registered.id])
  })

  it('registra no log em nome de quem registrou', async () => {
    const registered = await useCase.execute(input())
    expect(activityLog.entries).toEqual([
      {
        userId: ADMIN.userId,
        action: ActivityAction.BACKUP_REGISTRADO,
        entity: ActivityEntity.BACKUPS,
        entityId: registered.id,
        ip: ADMIN.ip,
      },
    ])
  })

  it('rejeita data no futuro sem gravar nem registrar no log', async () => {
    await expect(
      useCase.execute(input({ performedAt: new Date('2099-01-01T00:00:00Z') })),
    ).rejects.toBeInstanceOf(BackupInFutureError)
    expect(backups.items).toEqual([])
    expect(activityLog.entries).toEqual([])
  })
})
