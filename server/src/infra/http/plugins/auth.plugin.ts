import jwt from '@fastify/jwt'
import type { FastifyReply, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import type { GetAuthenticatedUserUseCase } from '../../../application/identity/get-authenticated-user.use-case.js'
import type { UserDto } from '../../../application/identity/user.dto.js'
import {
  AccessDeniedError,
  NotAuthenticatedError,
} from '../../../domain/identity/identity.errors.js'
import type { UserRole } from '../../../shared/utils/enums.js'

export const TOKEN_EXPIRES_IN = '1h'

type TokenPayload = { sub: string }

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: TokenPayload
    user: UserDto
  }
}

type Hook = (request: FastifyRequest, reply: FastifyReply) => Promise<void>

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: Hook
    requireRole: (...roles: UserRole[]) => Hook
  }
}

type AuthPluginOptions = {
  jwtSecret: string
  getAuthenticatedUser: GetAuthenticatedUserUseCase
}

export const authPlugin = fp<AuthPluginOptions>(
  async (app, { jwtSecret, getAuthenticatedUser }) => {
    await app.register(jwt, { secret: jwtSecret, sign: { expiresIn: TOKEN_EXPIRES_IN } })

    async function readTokenPayload(request: FastifyRequest): Promise<TokenPayload> {
      try {
        return await request.jwtVerify<TokenPayload>()
      } catch {
        throw new NotAuthenticatedError()
      }
    }

    app.decorate('authenticate', async (request: FastifyRequest) => {
      const { sub } = await readTokenPayload(request)
      request.user = await getAuthenticatedUser.execute(sub)
    })

    app.decorate('requireRole', (...roles: UserRole[]) => {
      return async (request: FastifyRequest, reply: FastifyReply) => {
        await app.authenticate(request, reply)
        if (!roles.includes(request.user.role)) throw new AccessDeniedError()
      }
    })
  },
)
