// Infra HTTP: único lugar que traduz erros de domínio e de validação em status e corpo HTTP.
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod'
import { BackupInFutureError } from '../../domain/backup/backup.errors.js'
import {
  CategoryNotAllowedError,
  CategoryNotFoundError,
  ClientCodeAlreadyInUseError,
  ClientNotFoundError,
  DocumentNameAlreadyInUseError,
  InactiveClientError,
  InvalidClientCodeError,
  InvalidDocumentNameError,
  InvalidPeriodError,
  UnknownCategoryError,
  UnknownClientError,
} from '../../domain/catalog/catalog.errors.js'
import {
  AccessDeniedError,
  AccountLockedError,
  EmailAlreadyInUseError,
  InvalidCredentialsError,
  InvalidEmailError,
  NotAuthenticatedError,
  OwnAccessChangeError,
  UserNotFoundError,
  WeakPasswordError,
} from '../../domain/identity/identity.errors.js'
import { DomainError } from '../../shared/errors/domain-error.js'

type DomainErrorClass = abstract new (...args: never[]) => DomainError

// Erro de domínio sem mapeamento explícito é tratado como regra violada.
const DEFAULT_DOMAIN_ERROR_STATUS = 400

// Status de cada erro de domínio; erro novo é uma linha aqui.
const HTTP_STATUS_BY_ERROR = new Map<DomainErrorClass, number>([
  [InvalidEmailError, 400],
  [WeakPasswordError, 400],
  [UnknownCategoryError, 400],
  [UnknownClientError, 400],
  [InactiveClientError, 400],
  [InvalidPeriodError, 400],
  [InvalidDocumentNameError, 400],
  [InvalidClientCodeError, 400],
  [BackupInFutureError, 400],
  [OwnAccessChangeError, 400],
  [InvalidCredentialsError, 401],
  [NotAuthenticatedError, 401],
  [AccessDeniedError, 403],
  [CategoryNotAllowedError, 403],
  [UserNotFoundError, 404],
  [CategoryNotFoundError, 404],
  [ClientNotFoundError, 404],
  [EmailAlreadyInUseError, 409],
  [ClientCodeAlreadyInUseError, 409],
  [DocumentNameAlreadyInUseError, 409],
  [AccountLockedError, 423],
])

// Usa instanceof para que subclasses herdem o status da classe mapeada.
function statusFor(error: DomainError): number {
  for (const [errorClass, status] of HTTP_STATUS_BY_ERROR) {
    if (error instanceof errorClass) return status
  }
  return DEFAULT_DOMAIN_ERROR_STATUS
}

// Mensagem genérica de entrada inválida; os detalhes vão na lista de campos.
export const INVALID_INPUT_MESSAGE = 'Dados inválidos.'

type ValidationIssue = { instancePath: string; message?: string }

// Converte o caminho do erro em "a.b.0"; sem caminho, usa o contexto (body, querystring, params).
function toInvalidField(issue: ValidationIssue, context: string) {
  const field = issue.instancePath.split('/').filter(Boolean).join('.')
  return { field: field || context, message: issue.message ?? INVALID_INPUT_MESSAGE }
}

// Validação vira 400 com campos, domínio vira o status mapeado e o 429 ganha mensagem em PT-BR.
export function errorHandler(error: FastifyError, _request: FastifyRequest, reply: FastifyReply) {
  if (hasZodFastifySchemaValidationErrors(error)) {
    const context = error.validationContext ?? 'body'
    return reply.code(400).send({
      message: INVALID_INPUT_MESSAGE,
      fields: error.validation.map((issue) => toInvalidField(issue, context)),
    })
  }
  if (error instanceof DomainError) {
    return reply.code(statusFor(error)).send({ message: error.message })
  }
  if (error.statusCode === 429) {
    return reply
      .code(429)
      .send({ message: 'Muitas tentativas. Aguarde antes de tentar novamente.' })
  }
  return reply.send(error)
}
