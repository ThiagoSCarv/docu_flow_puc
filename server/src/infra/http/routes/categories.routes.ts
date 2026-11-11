import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import type { ListCategoriesUseCase } from '../../../application/catalog/list-categories.use-case.js'
import { bearerAuth, categorySchema, messageSchema } from '../schemas.js'

type CategoryRoutesOptions = { listCategories: ListCategoriesUseCase }

export const categoryRoutes: FastifyPluginAsyncZod<CategoryRoutesOptions> = async (
  app,
  { listCategories },
) => {
  app.get(
    '/categories',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['categories'],
        summary: 'Lista as categorias que o usuário pode ver (ADMIN vê todas)',
        security: bearerAuth,
        response: { 200: z.array(categorySchema), 401: messageSchema },
      },
    },
    (request) => listCategories.execute(request.user),
  )
}
