import { inArray } from 'drizzle-orm'
import { Backup } from '../../domain/backup/backup.entity.js'
import { Client } from '../../domain/catalog/client.entity.js'
import { Document } from '../../domain/catalog/document.entity.js'
import { DocumentName } from '../../domain/catalog/document-name.value-object.js'
import { Period } from '../../domain/catalog/period.value-object.js'
import { Email } from '../../domain/identity/email.value-object.js'
import { Password } from '../../domain/identity/password.value-object.js'
import { User } from '../../domain/identity/user.entity.js'
import { ActivityAction, ActivityEntity, BackupStatus, UserRole } from '../../shared/utils/enums.js'
import { BcryptPasswordHasher } from '../crypto/bcrypt-password-hasher.js'
import {
  activityLogs,
  backups,
  categories,
  clients,
  documents,
  userCategoryPermissions,
  users,
} from './schema.js'
import type { Database } from './types.js'

export const DEMO_CLIENT_COUNT = 1000
export const DEMO_EMPLOYEE_EMAIL = 'funcionario@exemplo.com'
export const DEMO_VIEWER_EMAIL = 'consulta@exemplo.com'
export const DEMO_EMPLOYEE_CATEGORIES = ['CONT', 'FIS', 'FIN']
export const DEMO_VIEWER_CATEGORIES = ['CONT', 'FIS']

const USERS_PER_CLIENT = 0.5
const BACKUPS_PER_CLIENT = 1
const BASE_DOCUMENTS_PER_CLIENT = 3
const EXTRA_DOCUMENT_EVERY_N_CLIENTS = 4
const DEMO_YEAR = 2026
const MONTHS_WITH_DOCUMENTS = 10
const SEQUENCE_DIGITS = 4
const INSERT_CHUNK_SIZE = 1000
const SEED_ACTOR_IP = '127.0.0.1'
const DEMO_CLOUD_BASE_URL = 'https://nuvem.exemplo.com/escritorio'
const BACKUP_HOUR = 22
const FAILED_BACKUP_EVERY_N_DAYS = 20
const PENDING_VERIFICATION_DAYS = 3
const BACKUP_SCOPE = 'Pasta de clientes na nuvem'

const CATEGORY_CODES = ['CONT', 'FIS', 'FIN', 'CTR', 'ADM', 'OUT']
const ADMIN_ONLY_CATEGORIES = ['CTR', 'ADM', 'OUT']
const CLIENT_SEGMENTS = [
  'Comércio',
  'Indústria',
  'Serviços',
  'Transportes',
  'Construtora',
  'Clínica',
  'Padaria',
  'Mercado',
  'Agropecuária',
  'Tecnologia',
]
const CLIENT_SUFFIXES = ['Ltda', 'S.A.', 'ME', 'MEI']
const CATEGORY_SETS = [
  ['CONT', 'FIS', 'FIN'],
  ['FIS'],
  ['CONT'],
  ['FIN', 'CTR'],
  ['CONT', 'FIS'],
  ['ADM', 'OUT'],
]
const DESCRIPTIONS_BY_CATEGORY: Record<string, string[]> = {
  CONT: ['Balanço patrimonial', 'Balancete mensal', 'DRE', 'Livro razão'],
  FIS: ['Apuração do Simples Nacional', 'Guia de ICMS', 'Notas fiscais de entrada', 'DCTF'],
  FIN: ['Extrato bancário', 'Contas a pagar', 'Contas a receber', 'Fluxo de caixa'],
  CTR: ['Contrato de prestação de serviços', 'Aditivo contratual', 'Contrato de locação'],
  ADM: ['Alteração contratual', 'Procuração', 'Ata de reunião'],
  OUT: ['Comprovante de endereço', 'Correspondência recebida', 'Documento diverso'],
}

type ActorRef = { id: string }
type LogEntry = typeof activityLogs.$inferInsert

export type DemoSeedInput = {
  admin: { id: string; name: string }
  password: string
  clientCount?: number
}

export type DemoSeedSummary = {
  users: number
  clients: number
  documents: number
  backups: number
}

export function demoUserCount(clientCount: number) {
  return Math.max(2, Math.round(clientCount * USERS_PER_CLIENT))
}

export function demoDocumentCount(clientCount: number) {
  let total = 0
  for (let index = 0; index < clientCount; index++) total += documentsForClient(index)
  return total
}

export function demoBackupCount(clientCount: number) {
  return Math.round(clientCount * BACKUPS_PER_CLIENT)
}

export function demoClientCode(index: number) {
  return `CLI-${sequence(index)}`
}

export async function seedDemoData(
  db: Database,
  { admin, password, clientCount = DEMO_CLIENT_COUNT }: DemoSeedInput,
): Promise<DemoSeedSummary | null> {
  if (await demoDataExists(db, clientCount)) return null

  const now = new Date()
  const passwordHash = await new BcryptPasswordHasher().hash(Password.create(password).value)
  const categoryIdByCode = await loadCategoryIds(db)

  const demoUsers = buildUsers(clientCount, passwordHash, categoryIdByCode, now)
  const employee = demoUsers[0]
  const demoClients = buildClients(clientCount, now)
  const demoDocuments = buildDocuments({ demoClients, categoryIdByCode, admin, employee, now })
  const demoBackups = buildBackups(clientCount, admin, now)

  const logs: LogEntry[] = [
    ...demoUsers.map((user) =>
      logEntry(admin, ActivityAction.USUARIO_CRIADO, ActivityEntity.USERS, user.id),
    ),
    ...demoClients.map((client) =>
      logEntry(admin, ActivityAction.CLIENTE_CRIADO, ActivityEntity.CLIENTS, client.id),
    ),
    ...demoDocuments.map((document) =>
      logEntry(
        { id: document.createdBy },
        ActivityAction.DOCUMENTO_CRIADO,
        ActivityEntity.DOCUMENTS,
        document.id,
      ),
    ),
    ...demoBackups.map((backup) =>
      logEntry(admin, ActivityAction.BACKUP_REGISTRADO, ActivityEntity.BACKUPS, backup.id),
    ),
  ]

  await db.transaction(async (tx) => {
    await insertInChunks(tx, users, demoUsers.map(toUserRow))
    await insertInChunks(tx, userCategoryPermissions, demoUsers.flatMap(toPermissionRows))
    await insertInChunks(tx, clients, demoClients.map(toClientRow))
    await insertInChunks(tx, documents, demoDocuments.map(toDocumentRow))
    await insertInChunks(tx, backups, demoBackups.map(toBackupRow))
    await insertInChunks(tx, activityLogs, logs)
  })

  return {
    users: demoUsers.length,
    clients: demoClients.length,
    documents: demoDocuments.length,
    backups: demoBackups.length,
  }
}

function buildUsers(
  clientCount: number,
  passwordHash: string,
  categoryIdByCode: Map<string, string>,
  now: Date,
) {
  const fixedUsers = [
    {
      name: 'Funcionário Exemplo',
      email: DEMO_EMPLOYEE_EMAIL,
      role: UserRole.FUNCIONARIO,
      codes: DEMO_EMPLOYEE_CATEGORIES,
    },
    {
      name: 'Consulta Exemplo',
      email: DEMO_VIEWER_EMAIL,
      role: UserRole.CONSULTA,
      codes: DEMO_VIEWER_CATEGORIES,
    },
  ]
  const generatedUsers = Array.from(
    { length: demoUserCount(clientCount) - fixedUsers.length },
    (_, offset) => {
      const index = offset + fixedUsers.length
      const role = index % 3 === 0 ? UserRole.CONSULTA : UserRole.FUNCIONARIO
      const label = role === UserRole.CONSULTA ? 'consulta' : 'funcionario'
      return {
        name: `${role === UserRole.CONSULTA ? 'Consulta' : 'Funcionário'} Exemplo ${sequence(index)}`,
        email: `${label}.${sequence(index)}@exemplo.com`,
        role,
        codes: CATEGORY_SETS[index % CATEGORY_SETS.length],
      }
    },
  )

  return [...fixedUsers, ...generatedUsers].map((user) =>
    User.create(
      {
        name: user.name,
        email: Email.create(user.email),
        passwordHash,
        role: user.role,
        allowedCategoryIds: user.codes.map((code) => requireId(categoryIdByCode, code)),
      },
      now,
    ),
  )
}

function buildClients(clientCount: number, now: Date) {
  return Array.from({ length: clientCount }, (_, index) => {
    const segment = CLIENT_SEGMENTS[index % CLIENT_SEGMENTS.length]
    const suffix = CLIENT_SUFFIXES[index % CLIENT_SUFFIXES.length]
    return Client.create(
      { name: `${segment} Exemplo ${sequence(index)} ${suffix}`, code: demoClientCode(index) },
      now,
    )
  })
}

function buildDocuments(input: {
  demoClients: Client[]
  categoryIdByCode: Map<string, string>
  admin: ActorRef
  employee: ActorRef
  now: Date
}) {
  return input.demoClients.flatMap((client, clientIndex) =>
    Array.from({ length: documentsForClient(clientIndex) }, (_, documentIndex) => {
      const categoryCode = CATEGORY_CODES[(clientIndex + documentIndex) % CATEGORY_CODES.length]
      const descriptions = DESCRIPTIONS_BY_CATEGORY[categoryCode]
      const description = descriptions[(clientIndex + documentIndex) % descriptions.length]
      const month = ((clientIndex * 3 + documentIndex * 5) % MONTHS_WITH_DOCUMENTS) + 1
      const period = Period.create(`${DEMO_YEAR}-${String(month).padStart(2, '0')}`)
      const author = ADMIN_ONLY_CATEGORIES.includes(categoryCode) ? input.admin : input.employee
      return Document.create(
        {
          name: DocumentName.create({ clientCode: client.code, categoryCode, period, description }),
          description,
          period,
          cloudLocation: `${DEMO_CLOUD_BASE_URL}/${client.code}/${categoryCode}/${period.value}`,
          clientId: client.id,
          categoryId: requireId(input.categoryIdByCode, categoryCode),
          createdBy: author.id,
        },
        input.now,
      )
    }),
  )
}

function buildBackups(clientCount: number, admin: ActorRef, now: Date) {
  const lastBackupAt = new Date(now)
  lastBackupAt.setDate(lastBackupAt.getDate() - 1)
  lastBackupAt.setHours(BACKUP_HOUR, 0, 0, 0)

  return Array.from({ length: demoBackupCount(clientCount) }, (_, daysAgo) => {
    const performedAt = new Date(lastBackupAt)
    performedAt.setDate(performedAt.getDate() - daysAgo)
    return Backup.create(
      { ...backupOutcome(daysAgo), performedAt, scope: BACKUP_SCOPE, responsibleId: admin.id },
      now,
    )
  })
}

function backupOutcome(daysAgo: number): { status: BackupStatus; notes?: string } {
  if (daysAgo % FAILED_BACKUP_EVERY_N_DAYS === FAILED_BACKUP_EVERY_N_DAYS - 1) {
    return { status: BackupStatus.FALHOU, notes: 'Sincronização interrompida; repetir' }
  }
  if (daysAgo < PENDING_VERIFICATION_DAYS) {
    return { status: BackupStatus.REALIZADO, notes: 'Aguardando verificação' }
  }
  return { status: BackupStatus.VERIFICADO }
}

function documentsForClient(clientIndex: number) {
  const extra = clientIndex % EXTRA_DOCUMENT_EVERY_N_CLIENTS === 0 ? 1 : 0
  return BASE_DOCUMENTS_PER_CLIENT + extra
}

function sequence(index: number) {
  return String(index + 1).padStart(SEQUENCE_DIGITS, '0')
}

function logEntry(
  actor: ActorRef,
  action: ActivityAction,
  entity: ActivityEntity,
  entityId: string,
): LogEntry {
  return { userId: actor.id, action, entity, entityId, ip: SEED_ACTOR_IP }
}

function toUserRow(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email.value,
    passwordHash: user.passwordHash,
    role: user.role,
    active: user.active,
    failedLoginAttempts: user.failedLoginAttempts,
    lockedUntil: user.lockedUntil,
    createdAt: user.createdAt,
  }
}

function toPermissionRows(user: User) {
  return user.allowedCategoryIds.map((categoryId) => ({ userId: user.id, categoryId }))
}

function toClientRow(client: Client) {
  return {
    id: client.id,
    name: client.name,
    code: client.code,
    active: client.active,
    createdAt: client.createdAt,
  }
}

function toDocumentRow(document: Document) {
  return {
    id: document.id,
    name: document.name.value,
    description: document.description,
    period: document.period.value,
    cloudLocation: document.cloudLocation,
    clientId: document.clientId,
    categoryId: document.categoryId,
    createdBy: document.createdBy,
    createdAt: document.createdAt,
  }
}

function toBackupRow(backup: Backup) {
  return {
    id: backup.id,
    performedAt: backup.performedAt,
    status: backup.status,
    scope: backup.scope,
    notes: backup.notes,
    responsibleId: backup.responsibleId,
  }
}

async function insertInChunks<TTable extends Parameters<Database['insert']>[0]>(
  db: Database,
  table: TTable,
  rows: TTable['$inferInsert'][],
) {
  for (let start = 0; start < rows.length; start += INSERT_CHUNK_SIZE) {
    await db.insert(table).values(rows.slice(start, start + INSERT_CHUNK_SIZE))
  }
}

async function demoDataExists(db: Database, clientCount: number) {
  const codes = Array.from({ length: clientCount }, (_, index) => demoClientCode(index))
  const [existingClient] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(inArray(clients.code, codes))
    .limit(1)
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.email, [DEMO_EMPLOYEE_EMAIL, DEMO_VIEWER_EMAIL]))
    .limit(1)
  return Boolean(existingClient || existingUser)
}

async function loadCategoryIds(db: Database) {
  const rows = await db.select({ id: categories.id, code: categories.code }).from(categories)
  return new Map(rows.map((row) => [row.code, row.id]))
}

function requireId(idByCode: Map<string, string>, code: string) {
  const id = idByCode.get(code)
  if (!id) throw new Error(`Código ${code} não encontrado; rode a seed de categorias antes.`)
  return id
}
