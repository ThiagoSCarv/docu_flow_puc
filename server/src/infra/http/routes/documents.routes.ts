import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import type { CreateDocumentUseCase } from '../../../application/catalog/create-document.use-case.js'
import type { SearchDocumentsUseCase } from '../../../application/catalog/search-documents.use-case.js'
import { UserRole } from '../../../shared/utils/enums.js'
import {
  badRequestSchema,
  bearerAuth,
  documentSchema,
  messageSchema,
  pageSchema,
  paginationQuerySchema,
} from '../schemas.js'

type DocumentRoutesOptions = {
  createDocument: CreateDocumentUseCase
  searchDocuments: SearchDocumentsUseCase
}

const DESCRIPTION_MAX_LENGTH = 200
const SEARCH_MAX_LENGTH = 100

const optionalText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .transform((value) => value || undefined)

export const documentRoutes: FastifyPluginAsyncZod<DocumentRoutesOptions> = async (
  app,
  { createDocument, searchDocuments },
) => {
  app.get(
    '/documents',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['documents'],
        summary: 'Pesquisa documentos nas categorias que o usuário pode ver (ADMIN vê todas)',
        security: bearerAuth,
        querystring: paginationQuerySchema.extend({
          search: optionalText(SEARCH_MAX_LENGTH).describe('Trecho do nome ou da descrição'),
          categoryId: z.uuid().optional(),
          clientId: z.uuid().optional(),
          period: optionalText(7).describe('AAAA-MM'),
        }),
        response: { 200: pageSchema(documentSchema), 400: badRequestSchema, 401: messageSchema },
      },
    },
    (request) => {
      const { limit, offset, ...filters } = request.query
      return searchDocuments.execute({
        ...filters,
        page: { limit, offset },
        actor: request.user,
      })
    },
  )

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
          400: badRequestSchema,
          401: messageSchema,
          403: messageSchema,
          409: messageSchema,
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
