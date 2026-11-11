import type { ServerOptions as HttpsOptions } from 'node:https'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import Fastify, { type FastifyServerOptions } from 'fastify'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import type { Database } from './db/types.js'
import { authPlugin } from './plugins/auth.js'
import { authRoutes } from './routes/auth.js'
import { healthRoutes } from './routes/health.js'
import { userRoutes } from './routes/users.js'

export const API_PREFIX = '/api'

declare module 'fastify' {
  interface FastifyInstance {
    db: Database
  }
}

export type AppOptions = FastifyServerOptions & {
  db: Database
  jwtSecret: string
  https?: HttpsOptions
}

export async function buildApp({ db, jwtSecret, ...options }: AppOptions) {
  const app = Fastify(options as FastifyServerOptions).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  app.decorate('db', db)

  await app.register(helmet)
  await app.register(rateLimit, { global: false })

  await app.register(swagger, {
    openapi: {
      info: { title: 'OrganizaDoc API', version: '0.1.0' },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
    transform: jsonSchemaTransform,
  })
  await app.register(swaggerUi, { routePrefix: '/docs', staticCSP: true })

  await app.register(authPlugin, { jwtSecret })

  await app.register(healthRoutes, { prefix: API_PREFIX })
  await app.register(authRoutes, { prefix: API_PREFIX })
  await app.register(userRoutes, { prefix: API_PREFIX })

  return app
}
