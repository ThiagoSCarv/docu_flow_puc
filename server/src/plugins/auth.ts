import jwt from '@fastify/jwt'
import type { FastifyReply, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { findPublicUser, type PublicUser, type Role } from '../services/users.js'

export const TOKEN_EXPIRES_IN = '1h'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string }
    user: PublicUser
  }
}

type Hook = (request: FastifyRequest, reply: FastifyReply) => Promise<void>

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: Hook
    requireRole: (...roles: Role[]) => Hook
  }
}

export const authPlugin = fp<{ jwtSecret: string }>(async (app, { jwtSecret }) => {
  await app.register(jwt, { secret: jwtSecret, sign: { expiresIn: TOKEN_EXPIRES_IN } })

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    let payload: { sub: string }
    try {
      payload = await request.jwtVerify<{ sub: string }>()
    } catch {
      return reply.code(401).send({ message: 'Não autenticado' })
    }

    const user = await findPublicUser(app.db, payload.sub)
    if (!user?.active) {
      return reply.code(401).send({ message: 'Não autenticado' })
    }
    request.user = user
  })

  app.decorate('requireRole', (...roles: Role[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      await app.authenticate(request, reply)
      if (reply.sent) return
      if (!roles.includes(request.user.role)) {
        return reply.code(403).send({ message: 'Acesso negado' })
      }
    }
  })
})
