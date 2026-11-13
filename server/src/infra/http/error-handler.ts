import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod'
import { BackupInFutureError } from '../../domain/backup/backup.errors.js'
import {
  CategoryNotAllowedError,
  ClientCodeAlreadyInUseError,
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
  UserNotFoundError,
  WeakPasswordError,
} from '../../domain/identity/identity.errors.js'
import { DomainError } from '../../shared/errors/domain-error.js'

type DomainErrorClass = abstract new (...args: never[]) => DomainError

const DEFAULT_DOMAIN_ERROR_STATUS = 400

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
  [InvalidCredentialsError, 401],
  [NotAuthenticatedError, 401],
  [AccessDeniedError, 403],
  [CategoryNotAllowedError, 403],
  [UserNotFoundError, 404],
  [EmailAlreadyInUseError, 409],
  [ClientCodeAlreadyInUseError, 409],
  [DocumentNameAlreadyInUseError, 409],
  [AccountLockedError, 423],
])

function statusFor(error: DomainError): number {
  for (const [errorClass, status] of HTTP_STATUS_BY_ERROR) {
    if (error instanceof errorClass) return status
  }
  return DEFAULT_DOMAIN_ERROR_STATUS
}

export const INVALID_INPUT_MESSAGE = 'Dados inválidos.'

type ValidationIssue = { instancePath: string; message?: string }

function toInvalidField(issue: ValidationIssue, context: string) {
  const field = issue.instancePath.split('/').filter(Boolean).join('.')
  return { field: field || context, message: issue.message ?? INVALID_INPUT_MESSAGE }
}

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
  return reply.send(error)
}
