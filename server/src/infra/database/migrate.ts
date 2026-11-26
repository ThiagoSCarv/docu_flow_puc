// Script de linha de comando: aplica no banco as migrations geradas pelo drizzle-kit.
import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { db, pool } from './client.js'

// Pasta server/drizzle, onde ficam as migrations versionadas no git.
const migrationsFolder = fileURLToPath(new URL('../../../drizzle', import.meta.url))

// Aplica só as migrations pendentes e fecha o pool para o processo terminar.
await migrate(db, { migrationsFolder })
await pool.end()
console.log('Migrations aplicadas.')
