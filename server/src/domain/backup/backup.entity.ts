import type { BackupStatus } from '../../shared/utils/enums.js'
import { BackupInFutureError } from './backup.errors.js'

export type BackupProps = {
  id: string
  performedAt: Date
  status: BackupStatus
  scope: string
  notes: string | null
  responsibleId: string
}

export type NewBackupProps = Omit<BackupProps, 'id' | 'notes'> & { notes?: string }

export class Backup {
  private constructor(private readonly props: BackupProps) {}

  static create(input: NewBackupProps, now: Date): Backup {
    if (input.performedAt.getTime() > now.getTime()) throw new BackupInFutureError()
    return new Backup({
      ...input,
      id: crypto.randomUUID(),
      scope: input.scope.trim(),
      notes: input.notes?.trim() || null,
    })
  }

  static restore(props: BackupProps): Backup {
    return new Backup({ ...props })
  }

  get id() {
    return this.props.id
  }

  get performedAt() {
    return this.props.performedAt
  }

  get status() {
    return this.props.status
  }

  get scope() {
    return this.props.scope
  }

  get notes() {
    return this.props.notes
  }

  get responsibleId() {
    return this.props.responsibleId
  }
}
