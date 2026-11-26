// Domínio (backup): entidade do registro de backup; o sistema registra, não executa (RF22).
import type { BackupStatus } from '../../shared/utils/enums.js'
import { BackupInFutureError } from './backup.errors.js'

// Estado completo de um registro de backup, como persistido.
export type BackupProps = {
  id: string
  performedAt: Date
  status: BackupStatus
  scope: string
  notes: string | null
  responsibleId: string
}

// Dados de entrada de um novo registro: o id é gerado e a observação é opcional.
export type NewBackupProps = Omit<BackupProps, 'id' | 'notes'> & { notes?: string }

// Registro imutável: a situação não muda; uma verificação posterior vira novo registro.
export class Backup {
  private constructor(private readonly props: BackupProps) {}

  // Cria um registro novo, recusando data futura e normalizando escopo e observação.
  static create(input: NewBackupProps, now: Date): Backup {
    if (input.performedAt.getTime() > now.getTime()) throw new BackupInFutureError()
    return new Backup({
      ...input,
      id: crypto.randomUUID(),
      scope: input.scope.trim(),
      notes: input.notes?.trim() || null,
    })
  }

  // Reconstrói a entidade vinda do banco, sem revalidar.
  static restore(props: BackupProps): Backup {
    return new Backup({ ...props })
  }

  // Acessores somente leitura: o estado só é exposto, nunca alterado de fora.
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
