import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { env } from '../config/env.js'
import * as schema from './schema.js'

function trustedCertificateAuthority() {
  return { ca: readFileSync(join(env.CERTS_DIR, 'cert.pem')) }
}

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_SSL ? trustedCertificateAuthority() : undefined,
})

export const db = drizzle(pool, { schema })
