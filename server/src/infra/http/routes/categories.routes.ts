// Infra HTTP: rotas de categorias e de quem acessa cada categoria (RF12, RF19, RF20).
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import type { ListCategoriesUseCase } from '../../../application/catalog/list-categories.use-case.js'
import type { ListCategoryAccessUseCase } from '../../../application/identity/list-category-access.use-case.js'
import { UserRole } from '../../../shared/utils/enums.js'
import {
  badRequestSchema,
  bearerAuth,
  categorySchema,
  messageSchema,
  pageSchema,
  paginationQuerySchema,
  userSchema,
} from '../schemas.js'

type CategoryRoutesOptions = {
  listCategories: ListCategoriesUseCase
  listCategoryAccess: ListCategoryAccessUseCase
}

export const categoryRoutes: FastifyPluginAsyncZod<CategoryRoutesOptions> = async (
  app,
  { listCategories, listCategoryAccess },
) => {
  // GET /api/categories: qualquer autenticado; só as categorias permitidas ao usuário (RF19).
  app.get(
    '/categories',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Categorias'],
        summary: 'Lista as categorias que o usuário pode ver (ADMIN vê todas)',
        security: bearerAuth,
        response: { 200: z.array(categorySchema), 401: messageSchema },
      },
    },
    (request) => listCategories.execute(request.user),
  )

  // GET /api/categories/:id/users: só ADMIN; usuários que acessam a categoria, paginado (RF20).
  app.get(
    '/categories/:id/users',
    {
      onRequest: [app.requireRole(UserRole.ADMIN)],
      schema: {
        tags: ['Categorias'],
        summary:
          'Lista quem acessa a categoria: administradores e usuários com permissão (somente ADMIN)',
        security: bearerAuth,
        params: z.object({ id: z.uuid() }),
        querystring: paginationQuerySchema,
        response: {
          200: pageSchema(userSchema),
          400: badRequestSchema,
          401: messageSchema,
          403: messageSchema,
          404: messageSchema,
        },
      },
    },
    (request) => listCategoryAccess.execute({ categoryId: request.params.id, page: request.query }),
  )
}
