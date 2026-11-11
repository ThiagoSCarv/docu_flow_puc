import type { ServerOptions as HttpsOptions } from 'node:https'
import helmet from '@fastify/helmet'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import Fastify, { type FastifyServerOptions } from 'fastify'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { healthRoutes } from './routes/health.js'

export const API_PREFIX = '/api'

export type AppOptions = FastifyServerOptions & {
  https?: HttpsOptions
}

export async function buildApp(options: AppOptions = {}) {
  const app = Fastify(options as FastifyServerOptions).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await app.register(helmet)

  await app.register(swagger, {
    openapi: {
      info: { title: 'OrganizaDoc API', version: '0.1.0' },
    },
    transform: jsonSchemaTransform,
  })
  await app.register(swaggerUi, { routePrefix: '/docs', staticCSP: true })

  await app.register(healthRoutes, { prefix: API_PREFIX })

  return app
}
