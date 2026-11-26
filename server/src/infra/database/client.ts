// Infra: conexão real com o PostgreSQL (pg + Drizzle), com TLS opcional até o banco.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { env } from '../config/env.js'
import * as schema from './schema.js'

// Confia só no certificado autoassinado do projeto, validando cadeia e host do banco.
function trustedCertificateAuthority() {
  return { ca: readFileSync(join(env.CERTS_DIR, 'cert.pem')) }
}

// Pool de conexões; com DATABASE_SSL=true a comunicação servidor-banco passa a usar TLS.
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_SSL ? trustedCertificateAuthority() : undefined,
})

// Instância do Drizzle usada pelo servidor e pelos scripts de migração e seed.
export const db = drizzle(pool, { schema })
