import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { login } from '../services/auth.js'
import { bearerAuth, messageSchema, publicUserSchema } from './schemas.js'

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/auth/login',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: {
        tags: ['auth'],
        summary: 'Autentica com e-mail e senha e devolve um JWT válido por 1 hora',
        body: z.object({ email: z.email(), password: z.string().min(1) }),
        response: {
          200: z.object({ token: z.string() }),
          401: messageSchema,
          423: messageSchema,
        },
      },
    },
    async (request, reply) => {
      const result = await login(app.db, request.body, request.ip)

      if (result.status === 'locked') {
        return reply
          .code(423)
          .send({ message: 'Conta bloqueada temporariamente. Tente novamente em 15 minutos.' })
      }
      if (result.status === 'invalid') {
        return reply.code(401).send({ message: 'E-mail ou senha inválidos' })
      }

      const token = await reply.jwtSign({ sub: result.userId })
      return { token }
    },
  )

  app.get(
    '/auth/me',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Dados do usuário autenticado',
        security: bearerAuth,
        response: { 200: publicUserSchema, 401: messageSchema },
      },
    },
    async (request) => request.user,
  )
}
