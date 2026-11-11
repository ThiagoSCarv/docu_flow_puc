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

export const userRole = pgEnum('user_role', UserRole)
export const backupStatus = pgEnum('backup_status', BackupStatus)

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()

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

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  code: varchar('code', { length: 10 }).notNull().unique(),
})

export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  active: boolean('active').notNull().default(true),
  createdAt: createdAt(),
})

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
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
  (t) => [
    check('documents_period_format', sql`${t.period} ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'`),
    index('documents_client_id_idx').on(t.clientId),
    index('documents_category_id_idx').on(t.categoryId),
  ],
)

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
