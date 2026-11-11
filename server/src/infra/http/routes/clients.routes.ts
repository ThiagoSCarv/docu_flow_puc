import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import type { ListClientsUseCase } from '../../../application/catalog/list-clients.use-case.js'
import { bearerAuth, clientSchema, messageSchema } from '../schemas.js'

type ClientRoutesOptions = { listClients: ListClientsUseCase }

export const clientRoutes: FastifyPluginAsyncZod<ClientRoutesOptions> = async (
  app,
  { listClients },
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
}
