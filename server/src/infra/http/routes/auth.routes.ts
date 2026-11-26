// Infra HTTP: rotas de login e do usuário autenticado (RF02, RNF14).
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import type { LoginUseCase } from '../../../application/identity/login.use-case.js'
import { badRequestSchema, bearerAuth, messageSchema, userSchema } from '../schemas.js'

// Limite de tentativas por IP contra força bruta, somado ao bloqueio por conta (RNF13).
const LOGIN_RATE_LIMIT = { max: 10, timeWindow: '1 minute' }

type AuthRoutesOptions = { login: LoginUseCase }

export const authRoutes: FastifyPluginAsyncZod<AuthRoutesOptions> = async (app, { login }) => {
  // POST /api/auth/login: público; o caso de uso valida e a rota assina o JWT com o id do usuário.
  app.post(
    '/auth/login',
    {
      config: { rateLimit: LOGIN_RATE_LIMIT },
      schema: {
        tags: ['Autenticação'],
        summary: 'Autentica com e-mail e senha e devolve um JWT válido por 1 hora',
        body: z.object({ email: z.email(), password: z.string().min(1) }),
        response: {
          200: z.object({ token: z.string() }),
          400: badRequestSchema,
          401: messageSchema,
          423: messageSchema,
          429: messageSchema,
        },
      },
    },
    async (request, reply) => {
      const { userId } = await login.execute({ ...request.body, ip: request.ip })
      return { token: await reply.jwtSign({ sub: userId }) }
    },
  )

  // GET /api/auth/me: qualquer usuário autenticado; devolve os próprios dados, sem campos sensíveis.
  app.get(
    '/auth/me',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Autenticação'],
        summary: 'Dados do usuário autenticado',
        security: bearerAuth,
        response: { 200: userSchema, 401: messageSchema },
      },
    },
    async (request) => request.user,
  )
}
