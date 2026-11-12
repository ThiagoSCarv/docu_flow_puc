import type { ActivityLogRepository } from '../../domain/audit/activity-log.repository.js'
import { Backup } from '../../domain/backup/backup.entity.js'
import type { BackupRepository } from '../../domain/backup/backup.repository.js'
import { ActivityAction, ActivityEntity, type BackupStatus } from '../../shared/utils/enums.js'
import type { Clock } from '../ports/clock.js'
import { type BackupDto, toBackupDto } from './backup.dto.js'

export type RegisterBackupInput = {
  performedAt: Date
  status: BackupStatus
  scope: string
  notes?: string
  actor: { userId: string; name: string; ip: string }
}

export class RegisterBackupUseCase {
  constructor(
    private readonly backups: BackupRepository,
    private readonly activityLog: ActivityLogRepository,
    private readonly clock: Clock,
  ) {}

  async execute({ actor, ...details }: RegisterBackupInput): Promise<BackupDto> {
    const backup = Backup.create({ ...details, responsibleId: actor.userId }, this.clock.now())

    await this.backups.save(backup)
    await this.activityLog.record({
      userId: actor.userId,
      action: ActivityAction.BACKUP_REGISTRADO,
      entity: ActivityEntity.BACKUPS,
      entityId: backup.id,
      ip: actor.ip,
    })

    return toBackupDto(backup, actor.name)
  }
}
