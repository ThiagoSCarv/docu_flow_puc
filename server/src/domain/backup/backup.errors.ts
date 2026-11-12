import { DomainError } from '../../shared/errors/domain-error.js'

export class BackupInFutureError extends DomainError {
  constructor() {
    super('A data do backup não pode estar no futuro')
  }
}
