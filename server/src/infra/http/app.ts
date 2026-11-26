// Infra HTTP: monta a aplicação Fastify com segurança, documentação, autenticação e rotas da API.
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
import { z } from 'zod'
import type { Database } from '../database/types.js'
import { createUseCases } from './composition-root.js'
import { errorHandler } from './error-handler.js'
import { authPlugin } from './plugins/auth.plugin.js'
import { webAppPlugin } from './plugins/web-app.plugin.js'
import { activityLogRoutes } from './routes/activity-logs.routes.js'
import { authRoutes } from './routes/auth.routes.js'
import { backupRoutes } from './routes/backups.routes.js'
import { categoryRoutes } from './routes/categories.routes.js'
import { clientRoutes } from './routes/clients.routes.js'
import { dashboardRoutes } from './routes/dashboard.routes.js'
import { documentRoutes } from './routes/documents.routes.js'
import { healthRoutes } from './routes/health.routes.js'
import { securityGuidelineRoutes } from './routes/security-guidelines.routes.js'
import { userRoutes } from './routes/users.routes.js'

// Prefixo da API, para não colidir com as rotas do React Router servidas na mesma origem.
export const API_PREFIX = '/api'

// Banco e segredo chegam por parâmetro, para os testes montarem a app sem ler o .env.
export type AppOptions = FastifyServerOptions & {
  db: Database
  jwtSecret: string
  https?: HttpsOptions
  webDistDir?: string
}

// Cria a instância, liga os casos de uso e registra plugins e rotas; o cast mantém um tipo único.
export async function buildApp({ db, jwtSecret, webDistDir, ...options }: AppOptions) {
  const app = Fastify(options as FastifyServerOptions).withTypeProvider<ZodTypeProvider>()
  const useCases = createUseCases(db)

  // Validação Zod com mensagens em PT-BR (RNF07) e erros traduzidos num lugar só.
  z.config(z.locales.ptBR())
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  app.setErrorHandler(errorHandler)

  // Cabeçalhos de segurança e rate limit ligado só nas rotas que o pedem (ex.: login).
  await app.register(helmet)
  await app.register(rateLimit, { global: false })
  await registerDocs(app)

  // Autenticação JWT antes das rotas, para que todas possam usar app.authenticate.
  await app.register(authPlugin, {
    jwtSecret,
    getAuthenticatedUser: useCases.getAuthenticatedUser,
  })

  // Cada plugin de rota recebe só os casos de uso de que precisa.
  await app.register(healthRoutes, { prefix: API_PREFIX })
  await app.register(authRoutes, { prefix: API_PREFIX, login: useCases.login })
  await app.register(userRoutes, {
    prefix: API_PREFIX,
    createUser: useCases.createUser,
    listUsers: useCases.listUsers,
    resetUserPassword: useCases.resetUserPassword,
    changeUserStatus: useCases.changeUserStatus,
    changeUserPermissions: useCases.changeUserPermissions,
  })
  await app.register(documentRoutes, {
    prefix: API_PREFIX,
    createDocument: useCases.createDocument,
    searchDocuments: useCases.searchDocuments,
  })
  await app.register(categoryRoutes, {
    prefix: API_PREFIX,
    listCategories: useCases.listCategories,
    listCategoryAccess: useCases.listCategoryAccess,
  })
  await app.register(clientRoutes, {
    prefix: API_PREFIX,
    createClient: useCases.createClient,
    listClients: useCases.listClients,
    renameClient: useCases.renameClient,
    changeClientStatus: useCases.changeClientStatus,
  })
  await app.register(backupRoutes, {
    prefix: API_PREFIX,
    registerBackup: useCases.registerBackup,
    listBackups: useCases.listBackups,
    listPendingBackups: useCases.listPendingBackups,
  })

  await app.register(securityGuidelineRoutes, {
    prefix: API_PREFIX,
    listSecurityGuidelines: useCases.listSecurityGuidelines,
  })

  await app.register(activityLogRoutes, {
    prefix: API_PREFIX,
    listActivityLogs: useCases.listActivityLogs,
  })

  await app.register(dashboardRoutes, { prefix: API_PREFIX, getDashboard: useCases.getDashboard })

  // Serve o build do React na mesma origem HTTPS quando ele existe (npm run demo).
  if (webDistDir) await app.register(webAppPlugin, { root: webDistDir })

  return app
}

// Swagger em /docs gerado a partir dos schemas Zod, com autenticação Bearer JWT.
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
