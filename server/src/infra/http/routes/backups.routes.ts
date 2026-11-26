// Infra HTTP: rotas de registro e consulta de backups (RF22–RF25).
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import type { ListBackupsUseCase } from '../../../application/backup/list-backups.use-case.js'
import type { ListPendingBackupsUseCase } from '../../../application/backup/list-pending-backups.use-case.js'
import type { RegisterBackupUseCase } from '../../../application/backup/register-backup.use-case.js'
import { UserRole } from '../../../shared/utils/enums.js'
import {
  backupSchema,
  backupStatusSchema,
  badRequestSchema,
  bearerAuth,
  messageSchema,
  pageSchema,
  paginationQuerySchema,
} from '../schemas.js'

type BackupRoutesOptions = {
  registerBackup: RegisterBackupUseCase
  listBackups: ListBackupsUseCase
  listPendingBackups: ListPendingBackupsUseCase
}

export const backupRoutes: FastifyPluginAsyncZod<BackupRoutesOptions> = async (
  app,
  { registerBackup, listBackups, listPendingBackups },
) => {
  // GET /api/backups: qualquer autenticado; histórico paginado (RF24).
  app.get(
    '/backups',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Backups'],
        summary: 'Histórico de backups, do mais recente ao mais antigo',
        security: bearerAuth,
        querystring: paginationQuerySchema,
        response: { 200: pageSchema(backupSchema), 400: badRequestSchema, 401: messageSchema },
      },
    },
    (request) => listBackups.execute(request.query),
  )

  // GET /api/backups/pending: qualquer autenticado; backups ainda não verificados (RF25).
  app.get(
    '/backups/pending',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Backups'],
        summary: 'Backups REALIZADO ainda sem verificação: feitos depois do último VERIFICADO',
        security: bearerAuth,
        querystring: paginationQuerySchema,
        response: { 200: pageSchema(backupSchema), 400: badRequestSchema, 401: messageSchema },
      },
    },
    (request) => listPendingBackups.execute(request.query),
  )

  // POST /api/backups: só ADMIN; registra o backup com quem registrou como responsável (RF22, RF23).
  app.post(
    '/backups',
    {
      onRequest: [app.requireRole(UserRole.ADMIN)],
      schema: {
        tags: ['Backups'],
        summary: 'Registra um backup feito na nuvem; o responsável é quem registra (somente ADMIN)',
        security: bearerAuth,
        body: z.object({
          performedAt: z.iso.datetime({ offset: true }),
          status: backupStatusSchema,
          scope: z.string().trim().min(1).max(200),
          notes: z.string().trim().max(500).optional(),
        }),
        response: {
          201: backupSchema,
          400: badRequestSchema,
          401: messageSchema,
          403: messageSchema,
        },
      },
    },
    async (request, reply) => {
      const { performedAt, ...details } = request.body
      const backup = await registerBackup.execute({
        ...details,
        performedAt: new Date(performedAt),
        actor: { userId: request.user.id, name: request.user.name, ip: request.ip },
      })
      return reply.code(201).send(backup)
    },
  )
}
