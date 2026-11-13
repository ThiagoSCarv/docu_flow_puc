import { ListSecurityGuidelinesUseCase } from '../../application/awareness/list-security-guidelines.use-case.js'
import { ListBackupsUseCase } from '../../application/backup/list-backups.use-case.js'
import { RegisterBackupUseCase } from '../../application/backup/register-backup.use-case.js'
import { CreateClientUseCase } from '../../application/catalog/create-client.use-case.js'
import { CreateDocumentUseCase } from '../../application/catalog/create-document.use-case.js'
import { ListCategoriesUseCase } from '../../application/catalog/list-categories.use-case.js'
import { ListClientsUseCase } from '../../application/catalog/list-clients.use-case.js'
import { SearchDocumentsUseCase } from '../../application/catalog/search-documents.use-case.js'
import { CreateUserUseCase } from '../../application/identity/create-user.use-case.js'
import { GetAuthenticatedUserUseCase } from '../../application/identity/get-authenticated-user.use-case.js'
import { ListUsersUseCase } from '../../application/identity/list-users.use-case.js'
import { LoginUseCase } from '../../application/identity/login.use-case.js'
import { ResetUserPasswordUseCase } from '../../application/identity/reset-user-password.use-case.js'
import { SystemClock } from '../clock/system-clock.js'
import { BcryptPasswordHasher } from '../crypto/bcrypt-password-hasher.js'
import { DrizzleActivityLogRepository } from '../database/repositories/drizzle-activity-log.repository.js'
import { DrizzleBackupRepository } from '../database/repositories/drizzle-backup.repository.js'
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
  const backups = new DrizzleBackupRepository(db)
  const hasher = new BcryptPasswordHasher()
  const clock = new SystemClock()

  return {
    login: new LoginUseCase(users, hasher, activityLog, clock),
    createUser: new CreateUserUseCase(users, categories, hasher, activityLog, clock),
    listUsers: new ListUsersUseCase(users),
    resetUserPassword: new ResetUserPasswordUseCase(users, hasher, activityLog),
    getAuthenticatedUser: new GetAuthenticatedUserUseCase(users),
    createDocument: new CreateDocumentUseCase(documents, clients, categories, activityLog, clock),
    searchDocuments: new SearchDocumentsUseCase(documents),
    listCategories: new ListCategoriesUseCase(categories),
    createClient: new CreateClientUseCase(clients, activityLog, clock),
    listClients: new ListClientsUseCase(clients),
    registerBackup: new RegisterBackupUseCase(backups, activityLog, clock),
    listBackups: new ListBackupsUseCase(backups),
    listSecurityGuidelines: new ListSecurityGuidelinesUseCase(),
  }
}

export type UseCases = ReturnType<typeof createUseCases>
