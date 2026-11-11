import { Email } from '../../domain/identity/email.value-object.js'
import { Password } from '../../domain/identity/password.value-object.js'
import { env } from '../config/env.js'
import { BcryptPasswordHasher } from '../crypto/bcrypt-password-hasher.js'
import { db, pool } from './client.js'
import { seedAdmin, seedCategories } from './seed.js'

if (!env.SEED_ADMIN_EMAIL || !env.SEED_ADMIN_PASSWORD) {
  console.error('Defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD no server/.env para criar o admin.')
  process.exit(1)
}

const email = Email.create(env.SEED_ADMIN_EMAIL)
const password = Password.create(env.SEED_ADMIN_PASSWORD)

await seedCategories(db)
await seedAdmin(db, {
  name: 'Administrador',
  email: email.value,
  passwordHash: await new BcryptPasswordHasher().hash(password.value),
})
await pool.end()
console.log('Seed aplicado: categorias iniciais e administrador.')
