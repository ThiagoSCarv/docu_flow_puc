import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildApp } from './app.js'
import { db, pool } from './db/client.js'
import { env } from './env.js'

const keyPath = join(env.CERTS_DIR, 'key.pem')
const certPath = join(env.CERTS_DIR, 'cert.pem')

if (!existsSync(keyPath) || !existsSync(certPath)) {
  console.error('Certificados não encontrados. Rode `npm run certs` na raiz do repositório.')
  process.exit(1)
}

const app = await buildApp({
  db,
  jwtSecret: env.JWT_SECRET,
  logger: true,
  https: { key: readFileSync(keyPath), cert: readFileSync(certPath) },
})
app.addHook('onClose', () => pool.end())

try {
  await app.listen({ host: env.HOST, port: env.PORT })
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
