import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

const envFile = fileURLToPath(new URL('../../../.env', import.meta.url))
if (existsSync(envFile)) process.loadEnvFile(envFile)

const MIN_JWT_SECRET_LENGTH = 32

const envSchema = z.object({
  HOST: z.string().default('localhost'),
  PORT: z.coerce.number().int().positive().default(3333),
  CERTS_DIR: z.string().default(fileURLToPath(new URL('../../../../certs/', import.meta.url))),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  JWT_SECRET: z
    .string()
    .min(
      MIN_JWT_SECRET_LENGTH,
      `JWT_SECRET precisa ter no mínimo ${MIN_JWT_SECRET_LENGTH} caracteres`,
    ),
  SEED_ADMIN_EMAIL: z.email().optional(),
  SEED_ADMIN_PASSWORD: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('Variáveis de ambiente inválidas:', z.treeifyError(parsed.error))
  process.exit(1)
}

export const env = parsed.data
