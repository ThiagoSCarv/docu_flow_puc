// Infra: única leitura de process.env; valida as variáveis de ambiente com Zod na inicialização.
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

// Carrega server/.env sem dotenv, se o arquivo existir (em CI as variáveis vêm do ambiente).
const envFile = fileURLToPath(new URL('../../../.env', import.meta.url))
if (existsSync(envFile)) process.loadEnvFile(envFile)

// Tamanho mínimo do segredo do JWT, para dificultar ataque de força bruta à assinatura.
const MIN_JWT_SECRET_LENGTH = 32

// Formato esperado das variáveis, com padrões para host, porta, certificados e build do front.
const envSchema = z.object({
  HOST: z.string().default('localhost'),
  PORT: z.coerce.number().int().positive().default(3333),
  CERTS_DIR: z.string().default(fileURLToPath(new URL('../../../../certs/', import.meta.url))),
  WEB_DIST_DIR: z
    .string()
    .default(fileURLToPath(new URL('../../../../web/dist/', import.meta.url))),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  DATABASE_SSL: z.stringbool().default(false),
  JWT_SECRET: z
    .string()
    .min(
      MIN_JWT_SECRET_LENGTH,
      `JWT_SECRET precisa ter no mínimo ${MIN_JWT_SECRET_LENGTH} caracteres`,
    ),
  SEED_ADMIN_EMAIL: z.email().optional(),
  SEED_ADMIN_PASSWORD: z.string().optional(),
  SEED_DEMO_PASSWORD: z.string().optional(),
})

// Encerra o processo logo no início se alguma variável for inválida, em vez de falhar depois.
const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('Variáveis de ambiente inválidas:', z.treeifyError(parsed.error))
  process.exit(1)
}

export const env = parsed.data
