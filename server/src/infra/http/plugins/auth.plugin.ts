// Infra HTTP: plugin de autenticação JWT e verificação de perfil, sempre no servidor (RNF05).
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

// Validade do token (RNF14).
export const TOKEN_EXPIRES_IN = '1h'

// O token carrega só o id do usuário; perfil e permissões são lidos do banco a cada requisição.
type TokenPayload = { sub: string }

// Tipagem do payload e de request.user, que passa a ser o UserDto recarregado.
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: TokenPayload
    user: UserDto
  }
}

type Hook = (request: FastifyRequest, reply: FastifyReply) => Promise<void>

// Tipagem dos decorators app.authenticate e app.requireRole usados pelas rotas.
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

// fastify-plugin expõe os decorators para toda a aplicação, não só para este escopo.
export const authPlugin = fp<AuthPluginOptions>(
  async (app, { jwtSecret, getAuthenticatedUser }) => {
    await app.register(jwt, { secret: jwtSecret, sign: { expiresIn: TOKEN_EXPIRES_IN } })

    // Token ausente, inválido ou expirado vira o mesmo erro 401, sem revelar o motivo.
    async function readTokenPayload(request: FastifyRequest): Promise<TokenPayload> {
      try {
        return await request.jwtVerify<TokenPayload>()
      } catch {
        throw new NotAuthenticatedError()
      }
    }

    // Valida o token e recarrega o usuário, para que inativação e permissões valham na hora.
    app.decorate('authenticate', async (request: FastifyRequest) => {
      const { sub } = await readTokenPayload(request)
      request.user = await getAuthenticatedUser.execute(sub)
    })

    // Autentica e exige um dos perfis informados; caso contrário responde 403.
    app.decorate('requireRole', (...roles: UserRole[]) => {
      return async (request: FastifyRequest, reply: FastifyReply) => {
        await app.authenticate(request, reply)
        if (!roles.includes(request.user.role)) throw new AccessDeniedError()
      }
    })
  },
)
