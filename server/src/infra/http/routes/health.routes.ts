// Infra HTTP: rota de disponibilidade, para conferir que a API responde por HTTPS.
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  // GET /api/health: público; não toca no banco nem expõe dados.
  app.get(
    '/health',
    {
      schema: {
        tags: ['Disponibilidade'],
        summary: 'Verifica se a API está no ar',
        response: { 200: z.object({ status: z.literal('ok') }) },
      },
    },
    async () => ({ status: 'ok' as const }),
  )
}
