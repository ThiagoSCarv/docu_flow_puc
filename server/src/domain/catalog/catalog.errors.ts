import { DomainError } from '../../shared/errors/domain-error.js'

export class UnknownCategoryError extends DomainError {
  constructor() {
    super('Categoria inexistente')
  }
}
