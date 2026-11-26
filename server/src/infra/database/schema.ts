// Infra: schema Drizzle das 7 tabelas, com checks e uniques que são a última barreira das regras.
import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import {
  type ActivityAction,
  type ActivityEntity,
  BackupStatus,
  UserRole,
} from '../../shared/utils/enums.js'

// Enums do banco derivados dos enums TypeScript, para não haver duas fontes da verdade.
export const userRole = pgEnum('user_role', UserRole)
export const backupStatus = pgEnum('backup_status', BackupStatus)

// Coluna de data de criação reaproveitada pelas tabelas, com fuso horário e valor padrão.
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()

// Usuários com perfil, hash da senha e controle de bloqueio por tentativas (RF01, RNF04, RNF13).
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: userRole('role').notNull(),
    active: boolean('active').notNull().default(true),
    failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [check('users_email_lowercase', sql`${t.email} = lower(${t.email})`)],
)

// Categorias de documento; o código compõe o nome padronizado (RF12, RF31).
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  code: varchar('code', { length: 10 }).notNull().unique(),
})

// Clientes fictícios; inativar preserva o histórico de documentos (RF06, RF10).
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  active: boolean('active').notNull().default(true),
  createdAt: createdAt(),
})

// Catálogo de documentos: só metadados e link da nuvem, nunca o arquivo (RF11, RF17, RF31).
export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(),
    description: text('description'),
    period: varchar('period', { length: 7 }).notNull(),
    cloudLocation: text('cloud_location').notNull(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'restrict' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: createdAt(),
  },
  // Período no formato AAAA-MM garantido pelo banco e índices para os filtros por cliente e categoria.
  (t) => [
    check('documents_period_format', sql`${t.period} ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'`),
    index('documents_client_id_idx').on(t.clientId),
    index('documents_category_id_idx').on(t.categoryId),
  ],
)

// Categorias que cada usuário pode ver; chave composta evita permissão duplicada (RF19).
export const userCategoryPermissions = pgTable(
  'user_category_permissions',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.categoryId] })],
)

// Registro dos backups feitos na nuvem; o sistema só acompanha, não executa (RF22–RF24).
export const backups = pgTable('backups', {
  id: uuid('id').primaryKey().defaultRandom(),
  performedAt: timestamp('performed_at', { withTimezone: true }).notNull(),
  status: backupStatus('status').notNull(),
  scope: text('scope').notNull(),
  notes: text('notes'),
  responsibleId: uuid('responsible_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
})

// Log de atividades; mantém o registro mesmo se o usuário for removido (RF26, RNF08).
export const activityLogs = pgTable(
  'activity_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').$type<ActivityAction>().notNull(),
    entity: text('entity').$type<ActivityEntity>(),
    entityId: uuid('entity_id'),
    ip: text('ip'),
    createdAt: createdAt(),
  },
  (t) => [index('activity_logs_created_at_idx').on(t.createdAt)],
)
