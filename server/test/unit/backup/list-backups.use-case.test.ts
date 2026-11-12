import { describe, expect, it } from 'vitest'
import { ListBackupsUseCase } from '../../../src/application/backup/list-backups.use-case.js'
import { Backup } from '../../../src/domain/backup/backup.entity.js'
import { BackupStatus } from '../../../src/shared/utils/enums.js'
import { InMemoryBackupRepository } from '../../helpers/fakes.js'

const backupAt = (performedAt: string, status: BackupStatus) =>
  Backup.restore({
    id: `backup-${performedAt}`,
    performedAt: new Date(performedAt),
    status,
    scope: 'Pasta Clientes',
    notes: null,
    responsibleId: 'admin-id',
  })

describe('ListBackupsUseCase', () => {
  it('lista do mais recente ao mais antigo com o nome do responsável', async () => {
    const backups = new InMemoryBackupRepository(new Map([['admin-id', 'Administrador']]))
    await backups.save(backupAt('2026-11-01T10:00:00Z', BackupStatus.REALIZADO))
    await backups.save(backupAt('2026-11-08T10:00:00Z', BackupStatus.FALHOU))

    const history = await new ListBackupsUseCase(backups).execute()

    expect(history.map((backup) => backup.status)).toEqual([
      BackupStatus.FALHOU,
      BackupStatus.REALIZADO,
    ])
    expect(history[0].responsible).toEqual({ id: 'admin-id', name: 'Administrador' })
  })
})
