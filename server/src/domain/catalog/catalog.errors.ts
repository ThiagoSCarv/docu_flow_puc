// Domínio (catalog): erros de negócio de clientes, categorias e documentos, com texto ao usuário.
import { DomainError } from '../../shared/errors/domain-error.js'

// Categoria informada no corpo de um cadastro não existe (entrada inválida, 400).
export class UnknownCategoryError extends DomainError {
  constructor() {
    super('Categoria inexistente')
  }
}

// Categoria buscada pelo id na URL não existe (recurso ausente, 404).
export class CategoryNotFoundError extends DomainError {
  constructor() {
    super('Categoria não encontrada')
  }
}

// Cliente buscado pelo id na URL não existe (recurso ausente, 404).
export class ClientNotFoundError extends DomainError {
  constructor() {
    super('Cliente não encontrado')
  }
}

// Cliente informado no corpo do cadastro de documento não existe (400) (RF09).
export class UnknownClientError extends DomainError {
  constructor() {
    super('Cliente inexistente')
  }
}

// Cliente inativo mantém o histórico, mas não recebe documentos novos (RF10).
export class InactiveClientError extends DomainError {
  constructor() {
    super('Cliente inativo não recebe novos documentos')
  }
}

// Usuário sem perfil ou sem a categoria permitida tentou cadastrar documento nela (RF19).
export class CategoryNotAllowedError extends DomainError {
  constructor() {
    super('Você não tem permissão para cadastrar documentos nesta categoria')
  }
}

// Período fora do formato AAAA-MM ou com mês inexistente (RF14).
export class InvalidPeriodError extends DomainError {
  constructor() {
    super('Período inválido. Use o formato AAAA-MM.')
  }
}

// Código do cliente com caracteres não permitidos ou acima do tamanho máximo.
export class InvalidClientCodeError extends DomainError {
  constructor(maxLength: number) {
    super(`Código do cliente inválido. Use até ${maxLength} letras, números ou hífens.`)
  }
}

// Código já usado por outro cliente; o código compõe o nome padronizado e precisa ser único (409).
export class ClientCodeAlreadyInUseError extends DomainError {
  constructor() {
    super('Código de cliente já cadastrado')
  }
}

// Outro documento já tem o mesmo nome padronizado (409) (RF31).
export class DocumentNameAlreadyInUseError extends DomainError {
  constructor() {
    super('Já existe um documento com este nome padronizado')
  }
}

// Uma parte do nome ficou vazia após remover acentos e caracteres especiais (RF31).
export class InvalidDocumentNameError extends DomainError {
  constructor(part: string) {
    super(`Não foi possível padronizar o nome do documento: ${part} sem letras ou números`)
  }
}
