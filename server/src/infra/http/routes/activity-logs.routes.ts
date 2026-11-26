import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import type { ListActivityLogsUseCase } from '../../../application/audit/list-activity-logs.use-case.js'
import { ActivityAction, ActivityEntity, UserRole } from '../../../shared/utils/enums.js'
import {
  badRequestSchema,
  bearerAuth,
  messageSchema,
  pageSchema,
  paginationQuerySchema,
} from '../schemas.js'

type ActivityLogRoutesOptions = { listActivityLogs: ListActivityLogsUseCase }

const activityLogSchema = z.object({
  id: z.uuid(),
  action: z.enum(ActivityAction),
  entity: z.enum(ActivityEntity).nullable(),
  entityId: z.uuid().nullable(),
  ip: z.string().nullable(),
  createdAt: z.date(),
  user: z.object({ id: z.uuid(), name: z.string() }).nullable(),
})

export const activityLogRoutes: FastifyPluginAsyncZod<ActivityLogRoutesOptions> = async (
  app,
  { listActivityLogs },
) => {
  app.get(
    '/activity-logs',
    {
      onRequest: [app.requireRole(UserRole.ADMIN)],
      schema: {
        tags: ['Atividades'],
        summary: 'Log de atividades, do mais recente ao mais antigo (somente ADMIN)',
        security: bearerAuth,
        querystring: paginationQuerySchema.extend({
          action: z.enum(ActivityAction).optional(),
          userId: z.uuid().optional(),
        }),
        response: {
          200: pageSchema(activityLogSchema),
          400: badRequestSchema,
          401: messageSchema,
          403: messageSchema,
        },
      },
    },
    (request) => {
      const { limit, offset, ...criteria } = request.query
      return listActivityLogs.execute({ ...criteria, page: { limit, offset } })
    },
  )
}
