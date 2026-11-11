import { DomainError } from '../../shared/errors/domain-error.js'
import { LOCK_DURATION_MINUTES } from './user.entity.js'

export class InvalidCredentialsError extends DomainError {
  constructor() {
    super('E-mail ou senha inválidos')
  }
}

export class AccountLockedError extends DomainError {
  constructor() {
    super(`Conta bloqueada temporariamente. Tente novamente em ${LOCK_DURATION_MINUTES} minutos.`)
  }
}

export class NotAuthenticatedError extends DomainError {
  constructor() {
    super('Não autenticado')
  }
}

export class AccessDeniedError extends DomainError {
  constructor() {
    super('Acesso negado')
  }
}

export class EmailAlreadyInUseError extends DomainError {
  constructor() {
    super('E-mail já cadastrado')
  }
}

export class InvalidEmailError extends DomainError {
  constructor() {
    super('E-mail inválido')
  }
}

export class WeakPasswordError extends DomainError {}
