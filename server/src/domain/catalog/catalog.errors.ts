import { DomainError } from '../../shared/errors/domain-error.js'

export class UnknownCategoryError extends DomainError {
  constructor() {
    super('Categoria inexistente')
  }
}

export class UnknownClientError extends DomainError {
  constructor() {
    super('Cliente inexistente')
  }
}

export class InactiveClientError extends DomainError {
  constructor() {
    super('Cliente inativo não recebe novos documentos')
  }
}

export class CategoryNotAllowedError extends DomainError {
  constructor() {
    super('Você não tem permissão para cadastrar documentos nesta categoria')
  }
}

export class InvalidPeriodError extends DomainError {
  constructor() {
    super('Período inválido. Use o formato AAAA-MM.')
  }
}

export class InvalidClientCodeError extends DomainError {
  constructor(maxLength: number) {
    super(`Código do cliente inválido. Use até ${maxLength} letras, números ou hífens.`)
  }
}

export class ClientCodeAlreadyInUseError extends DomainError {
  constructor() {
    super('Código de cliente já cadastrado')
  }
}

export class DocumentNameAlreadyInUseError extends DomainError {
  constructor() {
    super('Já existe um documento com este nome padronizado')
  }
}

export class InvalidDocumentNameError extends DomainError {
  constructor(part: string) {
    super(`Não foi possível padronizar o nome do documento: ${part} sem letras ou números`)
  }
}
