import { eq } from 'drizzle-orm'
import { Email } from '../../domain/identity/email.value-object.js'
import { Password } from '../../domain/identity/password.value-object.js'
import { env } from '../config/env.js'
import { BcryptPasswordHasher } from '../crypto/bcrypt-password-hasher.js'
import { db, pool } from './client.js'
import { seedDemoData } from './demo-seed.js'
import { users } from './schema.js'
import { seedAdmin, seedCategories } from './seed.js'

const ADMIN_NAME = 'Administrador'
const withDemoData = process.argv.includes('--demo')

if (!env.SEED_ADMIN_EMAIL || !env.SEED_ADMIN_PASSWORD) {
  console.error('Defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD no server/.env para criar o admin.')
  process.exit(1)
}

if (withDemoData && !env.SEED_DEMO_PASSWORD) {
  console.error('Defina SEED_DEMO_PASSWORD no server/.env para criar os dados de demonstração.')
  process.exit(1)
}

const email = Email.create(env.SEED_ADMIN_EMAIL)
const password = Password.create(env.SEED_ADMIN_PASSWORD)

await seedCategories(db)
await seedAdmin(db, {
  name: ADMIN_NAME,
  email: email.value,
  passwordHash: await new BcryptPasswordHasher().hash(password.value),
})
console.log('Seed aplicado: categorias iniciais e administrador.')

if (withDemoData && env.SEED_DEMO_PASSWORD) {
  const [admin] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.email, email.value))
  const summary = await seedDemoData(db, { admin, password: env.SEED_DEMO_PASSWORD })
  console.log(
    summary
      ? `Dados de demonstração criados: ${summary.users} usuários, ${summary.clients} clientes, ${summary.documents} documentos e ${summary.backups} backups fictícios.`
      : 'Dados de demonstração já existiam; nada foi alterado.',
  )
}

await pool.end()
