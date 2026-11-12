import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import type { CreateClientUseCase } from '../../../application/catalog/create-client.use-case.js'
import type { ListClientsUseCase } from '../../../application/catalog/list-clients.use-case.js'
import { UserRole } from '../../../shared/utils/enums.js'
import { bearerAuth, clientSchema, messageSchema } from '../schemas.js'

type ClientRoutesOptions = { createClient: CreateClientUseCase; listClients: ListClientsUseCase }

export const clientRoutes: FastifyPluginAsyncZod<ClientRoutesOptions> = async (
  app,
  { createClient, listClients },
) => {
  app.get(
    '/clients',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['clients'],
        summary: 'Lista os clientes do escritório',
        security: bearerAuth,
        response: { 200: z.array(clientSchema), 401: messageSchema },
      },
    },
    () => listClients.execute(),
  )

  app.post(
    '/clients',
    {
      onRequest: [app.requireRole(UserRole.ADMIN)],
      schema: {
        tags: ['clients'],
        summary: 'Cadastra um cliente com código único (somente ADMIN)',
        security: bearerAuth,
        body: z.object({
          name: z.string().trim().min(1).max(200),
          code: z.string(),
        }),
        response: {
          201: clientSchema,
          400: messageSchema,
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
