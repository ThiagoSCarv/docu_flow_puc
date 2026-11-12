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
import type { Database } from '../database/types.js'
import { createUseCases } from './composition-root.js'
import { errorHandler } from './error-handler.js'
import { authPlugin } from './plugins/auth.plugin.js'
import { authRoutes } from './routes/auth.routes.js'
import { backupRoutes } from './routes/backups.routes.js'
import { categoryRoutes } from './routes/categories.routes.js'
import { clientRoutes } from './routes/clients.routes.js'
import { documentRoutes } from './routes/documents.routes.js'
import { healthRoutes } from './routes/health.routes.js'
import { securityGuidelineRoutes } from './routes/security-guidelines.routes.js'
import { userRoutes } from './routes/users.routes.js'

export const API_PREFIX = '/api'

export type AppOptions = FastifyServerOptions & {
  db: Database
  jwtSecret: string
  https?: HttpsOptions
}

export async function buildApp({ db, jwtSecret, ...options }: AppOptions) {
  const app = Fastify(options as FastifyServerOptions).withTypeProvider<ZodTypeProvider>()
  const useCases = createUseCases(db)

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  app.setErrorHandler(errorHandler)

  await app.register(helmet)
  await app.register(rateLimit, { global: false })
  await registerDocs(app)

  await app.register(authPlugin, {
    jwtSecret,
    getAuthenticatedUser: useCases.getAuthenticatedUser,
  })

  await app.register(healthRoutes, { prefix: API_PREFIX })
  await app.register(authRoutes, { prefix: API_PREFIX, login: useCases.login })
  await app.register(userRoutes, {
    prefix: API_PREFIX,
    createUser: useCases.createUser,
    listUsers: useCases.listUsers,
  })
  await app.register(documentRoutes, {
    prefix: API_PREFIX,
    createDocument: useCases.createDocument,
    searchDocuments: useCases.searchDocuments,
  })
  await app.register(categoryRoutes, {
    prefix: API_PREFIX,
    listCategories: useCases.listCategories,
  })
  await app.register(clientRoutes, {
    prefix: API_PREFIX,
    createClient: useCases.createClient,
    listClients: useCases.listClients,
  })
  await app.register(backupRoutes, {
    prefix: API_PREFIX,
    registerBackup: useCases.registerBackup,
    listBackups: useCases.listBackups,
  })

  await app.register(securityGuidelineRoutes, {
    prefix: API_PREFIX,
    listSecurityGuidelines: useCases.listSecurityGuidelines,
  })

  return app
}

async function registerDocs(app: ReturnType<typeof Fastify>) {
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
}
