import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import * as schema from '../../src/db/schema.js'
import type { Database } from '../../src/db/types.js'

const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url))

export async function createTestDb() {
  const client = new PGlite()
  const db = drizzle(client, { schema })
  await migrate(db, { migrationsFolder })
  return { db: db as Database, close: () => client.close() }
}
