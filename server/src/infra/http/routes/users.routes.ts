import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import type { CreateUserUseCase } from '../../../application/identity/create-user.use-case.js'
import type { ListUsersUseCase } from '../../../application/identity/list-users.use-case.js'
import type { ResetUserPasswordUseCase } from '../../../application/identity/reset-user-password.use-case.js'
import { UserRole } from '../../../shared/utils/enums.js'
import { bearerAuth, messageSchema, roleSchema, userSchema } from '../schemas.js'

type UserRoutesOptions = {
  createUser: CreateUserUseCase
  listUsers: ListUsersUseCase
  resetUserPassword: ResetUserPasswordUseCase
}

export const userRoutes: FastifyPluginAsyncZod<UserRoutesOptions> = async (
  app,
  { createUser, listUsers, resetUserPassword },
) => {
  app.addHook('onRequest', app.requireRole(UserRole.ADMIN))

  app.get(
    '/users',
    {
      schema: {
        tags: ['users'],
        summary: 'Lista os usuários (somente ADMIN)',
        security: bearerAuth,
        response: { 200: z.array(userSchema), 401: messageSchema, 403: messageSchema },
      },
    },
    () => listUsers.execute(),
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
          password: z.string(),
          role: roleSchema,
          categoryIds: z.array(z.uuid()).default([]),
        }),
        response: {
          201: userSchema,
          400: messageSchema,
          401: messageSchema,
          403: messageSchema,
          409: messageSchema,
        },
      },
    },
    async (request, reply) => {
      const user = await createUser.execute({
        ...request.body,
        actor: { userId: request.user.id, ip: request.ip },
      })
      return reply.code(201).send(user)
    },
  )

  app.patch(
    '/users/:id/password',
    {
      schema: {
        tags: ['users'],
        summary: 'Redefine a senha de um usuário e desbloqueia a conta (somente ADMIN)',
        security: bearerAuth,
        params: z.object({ id: z.uuid() }),
        body: z.object({ password: z.string() }),
        response: {
          204: z.null(),
          400: messageSchema,
          401: messageSchema,
          403: messageSchema,
          404: messageSchema,
        },
      },
    },
    async (request, reply) => {
      await resetUserPassword.execute({
        userId: request.params.id,
        password: request.body.password,
        actor: { userId: request.user.id, ip: request.ip },
      })
      return reply.code(204).send(null)
    },
  )
}
