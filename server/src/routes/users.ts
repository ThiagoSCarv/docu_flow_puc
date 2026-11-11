import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { createUser, listUsers } from '../services/users.js'
import {
  bearerAuth,
  messageSchema,
  passwordSchema,
  publicUserSchema,
  roleSchema,
} from './schemas.js'

export const userRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', app.requireRole('ADMIN'))

  app.get(
    '/users',
    {
      schema: {
        tags: ['users'],
        summary: 'Lista os usuários (somente ADMIN)',
        security: bearerAuth,
        response: { 200: z.array(publicUserSchema), 401: messageSchema, 403: messageSchema },
      },
    },
    () => listUsers(app.db),
  )

  app.post(
    '/users',
    {
      schema: {
        tags: ['users'],
        summary: 'Cadastra um usuário com perfil e categorias permitidas (somente ADMIN)',
        security: bearerAuth,
        body: z.object({
          name: z.string().trim().min(1),
          email: z.email(),
          password: passwordSchema,
          role: roleSchema,
          categoryIds: z.array(z.uuid()).default([]),
        }),
        response: {
          201: publicUserSchema,
          400: messageSchema,
          401: messageSchema,
          403: messageSchema,
          409: messageSchema,
        },
      },
    },
    async (request, reply) => {
      const result = await createUser(app.db, request.body, {
        userId: request.user.id,
        ip: request.ip,
      })

      if (result.status === 'email_taken') {
        return reply.code(409).send({ message: 'E-mail já cadastrado' })
      }
      if (result.status === 'unknown_category') {
        return reply.code(400).send({ message: 'Categoria inexistente' })
      }
      return reply.code(201).send(result.user)
    },
  )
}
