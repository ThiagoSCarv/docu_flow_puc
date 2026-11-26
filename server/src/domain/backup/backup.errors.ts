// Domínio (backup): erros de negócio do registro de backups, com mensagem para o usuário.
import { DomainError } from '../../shared/errors/domain-error.js'

// Lançado quando a data informada do backup é posterior ao momento atual (vira 400).
export class BackupInFutureError extends DomainError {
  constructor() {
    super('A data do backup não pode estar no futuro')
  }
}
