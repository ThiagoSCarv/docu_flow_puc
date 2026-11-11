import { CreateDocumentUseCase } from '../../application/catalog/create-document.use-case.js'
import { ListCategoriesUseCase } from '../../application/catalog/list-categories.use-case.js'
import { ListClientsUseCase } from '../../application/catalog/list-clients.use-case.js'
import { SearchDocumentsUseCase } from '../../application/catalog/search-documents.use-case.js'
import { CreateUserUseCase } from '../../application/identity/create-user.use-case.js'
import { GetAuthenticatedUserUseCase } from '../../application/identity/get-authenticated-user.use-case.js'
import { ListUsersUseCase } from '../../application/identity/list-users.use-case.js'
import { LoginUseCase } from '../../application/identity/login.use-case.js'
import { SystemClock } from '../clock/system-clock.js'
import { BcryptPasswordHasher } from '../crypto/bcrypt-password-hasher.js'
import { DrizzleActivityLogRepository } from '../database/repositories/drizzle-activity-log.repository.js'
import { DrizzleCategoryRepository } from '../database/repositories/drizzle-category.repository.js'
import { DrizzleClientRepository } from '../database/repositories/drizzle-client.repository.js'
import { DrizzleDocumentRepository } from '../database/repositories/drizzle-document.repository.js'
import { DrizzleUserRepository } from '../database/repositories/drizzle-user.repository.js'
import type { Database } from '../database/types.js'

export function createUseCases(db: Database) {
  const users = new DrizzleUserRepository(db)
  const categories = new DrizzleCategoryRepository(db)
  const clients = new DrizzleClientRepository(db)
  const documents = new DrizzleDocumentRepository(db)
  const activityLog = new DrizzleActivityLogRepository(db)
  const hasher = new BcryptPasswordHasher()
  const clock = new SystemClock()

  return {
    login: new LoginUseCase(users, hasher, activityLog, clock),
    createUser: new CreateUserUseCase(users, categories, hasher, activityLog, clock),
    listUsers: new ListUsersUseCase(users),
    getAuthenticatedUser: new GetAuthenticatedUserUseCase(users),
    createDocument: new CreateDocumentUseCase(documents, clients, categories, activityLog, clock),
    searchDocuments: new SearchDocumentsUseCase(documents),
    listCategories: new ListCategoriesUseCase(categories),
    listClients: new ListClientsUseCase(clients),
  }
}

export type UseCases = ReturnType<typeof createUseCases>
