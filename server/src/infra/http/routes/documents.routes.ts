import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import type { CreateDocumentUseCase } from '../../../application/catalog/create-document.use-case.js'
import { UserRole } from '../../../shared/utils/enums.js'
import { bearerAuth, documentSchema, messageSchema } from '../schemas.js'

type DocumentRoutesOptions = { createDocument: CreateDocumentUseCase }

const DESCRIPTION_MAX_LENGTH = 200

export const documentRoutes: FastifyPluginAsyncZod<DocumentRoutesOptions> = async (
  app,
  { createDocument },
) => {
  app.post(
    '/documents',
    {
      onRequest: [app.requireRole(UserRole.ADMIN, UserRole.FUNCIONARIO)],
      schema: {
        tags: ['documents'],
        summary:
          'Cadastra um documento com nome padronizado (ADMIN, ou FUNCIONARIO nas categorias permitidas)',
        security: bearerAuth,
        body: z.object({
          clientId: z.uuid(),
          categoryId: z.uuid(),
          period: z.string().describe('AAAA-MM'),
          description: z.string().trim().min(1).max(DESCRIPTION_MAX_LENGTH),
          cloudLocation: z.url({ protocol: /^https$/ }).describe('Link do arquivo na nuvem'),
        }),
        response: {
          201: documentSchema,
          400: messageSchema,
          401: messageSchema,
          403: messageSchema,
        },
      },
    },
    async (request, reply) => {
      const { id, role, allowedCategoryIds } = request.user
      const document = await createDocument.execute({
        ...request.body,
        actor: { userId: id, role, allowedCategoryIds, ip: request.ip },
      })
      return reply.code(201).send(document)
    },
  )
}
