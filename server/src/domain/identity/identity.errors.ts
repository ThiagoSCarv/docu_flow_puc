// Domínio (identity): erros de autenticação e gestão de usuários, com texto ao usuário.
import { DomainError } from '../../shared/errors/domain-error.js'
import { LOCK_DURATION_MINUTES } from './user.entity.js'

// Mensagem genérica de login: não revela se o e-mail existe ou se a conta está inativa (RF02).
export class InvalidCredentialsError extends DomainError {
  constructor() {
    super('E-mail ou senha inválidos')
  }
}

// Conta bloqueada após tentativas seguidas de senha errada (423) (RNF13).
export class AccountLockedError extends DomainError {
  constructor() {
    super(`Conta bloqueada temporariamente. Tente novamente em ${LOCK_DURATION_MINUTES} minutos.`)
  }
}

// Requisição sem token válido ou de usuário que não pode mais entrar (401).
export class NotAuthenticatedError extends DomainError {
  constructor() {
    super('Não autenticado')
  }
}

// Usuário autenticado, mas com perfil sem permissão para a ação (403) (RNF05).
export class AccessDeniedError extends DomainError {
  constructor() {
    super('Acesso negado')
  }
}

// Cadastro com e-mail que outro usuário já usa (409) (RF01).
export class EmailAlreadyInUseError extends DomainError {
  constructor() {
    super('E-mail já cadastrado')
  }
}

// Usuário buscado pelo id na URL não existe (404).
export class UserNotFoundError extends DomainError {
  constructor() {
    super('Usuário não encontrado')
  }
}

// Impede o ADMIN de mudar a própria situação ou permissões e se trancar fora (400) (RF04, RF20).
export class OwnAccessChangeError extends DomainError {
  constructor() {
    super('Você não pode alterar o próprio acesso')
  }
}

// E-mail fora do formato esperado.
export class InvalidEmailError extends DomainError {
  constructor() {
    super('E-mail inválido')
  }
}

// Senha fora da política; a mensagem vem da regra descumprida (RNF15).
export class WeakPasswordError extends DomainError {}
