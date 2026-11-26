// Infra: tipo comum do banco, para o mesmo código rodar com node-postgres e com PGlite nos testes.
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import type * as schema from './schema.js'

// Banco tipado pelo schema, independente do driver concreto.
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>
