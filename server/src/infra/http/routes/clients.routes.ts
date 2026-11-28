// Infra HTTP: rotas de cadastro, consulta, edição e inativação de clientes (RF06–RF08, RF10).
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import type { ChangeClientStatusUseCase } from '../../../application/catalog/change-client-status.use-case.js'
import type { CreateClientUseCase } from '../../../application/catalog/create-client.use-case.js'
import type { ListClientsUseCase } from '../../../application/catalog/list-clients.use-case.js'
import type { RenameClientUseCase } from '../../../application/catalog/rename-client.use-case.js'
import { UserRole } from '../../../shared/utils/enums.js'
import {
  badRequestSchema,
  bearerAuth,
  clientSchema,
  messageSchema,
  pageSchema,
  paginationQuerySchema,
} from '../schemas.js'

type ClientRoutesOptions = {
  createClient: CreateClientUseCase
  listClients: ListClientsUseCase
  renameClient: RenameClientUseCase
  changeClientStatus: ChangeClientStatusUseCase
}

// Parâmetro :id validado como UUID antes de chegar ao banco.
const clientIdParams = z.object({ id: z.uuid() })

export const clientRoutes: FastifyPluginAsyncZod<ClientRoutesOptions> = async (
  app,
  { createClient, listClients, renameClient, changeClientStatus },
) => {
  // PATCH /api/clients/:id: só ADMIN; renomeia o cliente mantendo o código (RF07).
  app.patch(
    '/clients/:id',
    {
      onRequest: [app.requireRole(UserRole.ADMIN)],
      schema: {
        tags: ['Clientes'],
        summary: 'Altera o nome do cliente; o código não muda (somente ADMIN)',
        security: bearerAuth,
        params: clientIdParams,
        body: z.object({ name: z.string().trim().min(1).max(200) }),
        response: {
          200: clientSchema,
          400: badRequestSchema,
          401: messageSchema,
          403: messageSchema,
          404: messageSchema,
        },
      },
    },
    (request) =>
      renameClient.execute({
        clientId: request.params.id,
        name: request.body.name,
        actor: { userId: request.user.id, ip: request.ip },
      }),
  )

  // PATCH /api/clients/:id/status: só ADMIN; ativa ou inativa sem apagar documentos (RF10).
  app.patch(
    '/clients/:id/status',
    {
      onRequest: [app.requireRole(UserRole.ADMIN)],
      schema: {
        tags: ['Clientes'],
        summary: 'Ativa ou inativa o cliente, mantendo os documentos e o histórico (somente ADMIN)',
        security: bearerAuth,
        params: clientIdParams,
        body: z.object({ active: z.boolean() }),
        response: {
          200: clientSchema,
          400: badRequestSchema,
          401: messageSchema,
          403: messageSchema,
          404: messageSchema,
        },
      },
    },
    (request) =>
      changeClientStatus.execute({
        clientId: request.params.id,
        active: request.body.active,
        actor: { userId: request.user.id, ip: request.ip },
      }),
  )

  // GET /api/clients: qualquer autenticado; lista paginada em ordem alfabética (RF08).
  app.get(
    '/clients',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Clientes'],
        summary: 'Lista os clientes do escritório, em ordem alfabética',
        security: bearerAuth,
        querystring: paginationQuerySchema,
        response: { 200: pageSchema(clientSchema), 400: badRequestSchema, 401: messageSchema },
      },
    },
    (request) => listClients.execute(request.query),
  )

  // POST /api/clients: só ADMIN; cadastra cliente com código único, 409 se repetido (RF06).
  app.post(
    '/clients',
    {
      onRequest: [app.requireRole(UserRole.ADMIN)],
      schema: {
        tags: ['Clientes'],
        summary: 'Cadastra um cliente com código único (somente ADMIN)',
        security: bearerAuth,
        body: z.object({
          name: z.string().trim().min(1).max(200),
          code: z
            .string()
            .trim()
            .min(1)
            .max(20)
            .regex(/^[A-Za-z0-9-]+$/, 'Use apenas letras, números e hífen'),
        }),
        response: {
          201: clientSchema,
          400: badRequestSchema,
          401: messageSchema,
          403: messageSchema,
          409: messageSchema,
        },
      },
    },
    async (request, reply) => {
      const client = await createClient.execute({
        ...request.body,
        actor: { userId: request.user.id, ip: request.ip },
      })
      return reply.code(201).send(client)
    },
  )
}
