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

const clientIdParams = z.object({ id: z.uuid() })

export const clientRoutes: FastifyPluginAsyncZod<ClientRoutesOptions> = async (
  app,
  { createClient, listClients, renameClient, changeClientStatus },
) => {
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
          code: z.string(),
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
