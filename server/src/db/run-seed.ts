import { env } from '../env.js'
import { passwordSchema } from '../routes/schemas.js'
import { hashPassword } from '../services/auth.js'
import { db, pool } from './client.js'
import { seedAdmin, seedCategories } from './seed.js'

if (!env.SEED_ADMIN_EMAIL || !env.SEED_ADMIN_PASSWORD) {
  console.error('Defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD no server/.env para criar o admin.')
  process.exit(1)
}

const password = passwordSchema.safeParse(env.SEED_ADMIN_PASSWORD)
if (!password.success) {
  console.error(
    'SEED_ADMIN_PASSWORD inválida:',
    password.error.issues.map((i) => i.message),
  )
  process.exit(1)
}

await seedCategories(db)
await seedAdmin(db, {
  name: 'Administrador',
  email: env.SEED_ADMIN_EMAIL,
  passwordHash: await hashPassword(password.data),
})
await pool.end()
console.log('Seed aplicado: categorias iniciais e administrador.')
