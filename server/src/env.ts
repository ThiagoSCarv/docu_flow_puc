import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

const envFile = fileURLToPath(new URL('../.env', import.meta.url))
if (existsSync(envFile)) process.loadEnvFile(envFile)

const envSchema = z.object({
  HOST: z.string().default('localhost'),
  PORT: z.coerce.number().int().positive().default(3333),
  CERTS_DIR: z.string().default(fileURLToPath(new URL('../../certs/', import.meta.url))),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('Variáveis de ambiente inválidas:', z.treeifyError(parsed.error))
  process.exit(1)
}

export const env = parsed.data
