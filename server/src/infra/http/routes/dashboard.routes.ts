// Infra HTTP: rota do painel de indicadores do escritório (RF29).
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import type { GetDashboardUseCase } from '../../../application/dashboard/get-dashboard.use-case.js'
import { backupSchema, bearerAuth, messageSchema } from '../schemas.js'

type DashboardRoutesOptions = { getDashboard: GetDashboardUseCase }

// Indicadores: documentos por categoria, clientes por situação e situação dos backups.
const dashboardSchema = z.object({
  documents: z.object({
    total: z.number().int(),
    byCategory: z.array(z.object({ categoryId: z.uuid(), total: z.number().int() })),
  }),
  clients: z.object({ active: z.number().int(), inactive: z.number().int() }),
  backups: z.object({
    pendingVerification: z.number().int(),
    latest: backupSchema.nullable(),
  }),
})

export const dashboardRoutes: FastifyPluginAsyncZod<DashboardRoutesOptions> = async (
  app,
  { getDashboard },
) => {
  // GET /api/dashboard: qualquer autenticado; documentos contam só as categorias permitidas.
  app.get(
    '/dashboard',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Painel'],
        summary: 'Indicadores do escritório; documentos contam só as categorias permitidas',
        security: bearerAuth,
        response: { 200: dashboardSchema, 401: messageSchema },
      },
    },
    (request) => getDashboard.execute(request.user),
  )
}
