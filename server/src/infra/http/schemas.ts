// Infra HTTP: schemas Zod compartilhados; os de resposta descartam campos sensíveis (RNF10).
import { z } from 'zod'
import { BackupStatus, UserRole } from '../../shared/utils/enums.js'

// Perfis de acesso aceitos pela API (RF05).
export const roleSchema = z.enum(UserRole)

// Usuário exposto pela API: sem passwordHash, tentativas de login nem bloqueio.
export const userSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  role: roleSchema,
  active: z.boolean(),
  createdAt: z.date(),
  allowedCategoryIds: z.array(z.uuid()),
})

// Metadados de um documento do catálogo, com o link da nuvem (RF11, RF17).
export const documentSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string(),
  period: z.string(),
  cloudLocation: z.url(),
  clientId: z.uuid(),
  categoryId: z.uuid(),
  createdBy: z.uuid(),
  createdAt: z.date(),
})

// Categoria de documento com o código usado no nome padronizado.
export const categorySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  code: z.string(),
})

// Cliente fictício e sua situação (ativo ou inativo).
export const clientSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  code: z.string(),
  active: z.boolean(),
})

// Situações possíveis de um backup: REALIZADO, VERIFICADO ou FALHOU.
export const backupStatusSchema = z.enum(BackupStatus)

// Registro de backup com só o id e o nome do responsável (RF22–RF24).
export const backupSchema = z.object({
  id: z.uuid(),
  performedAt: z.date(),
  status: backupStatusSchema,
  scope: z.string(),
  notes: z.string().nullable(),
  responsible: z.object({ id: z.uuid(), name: z.string() }),
})

// Orientação educativa de segurança com suas boas práticas (RF28).
export const securityGuidelineSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  practices: z.array(z.string()),
})

// Corpo padrão de erro: só uma mensagem.
export const messageSchema = z.object({ message: z.string() })

// Erro 400 com a lista opcional de campos inválidos; sem ela o serializer descartaria fields.
export const badRequestSchema = messageSchema.extend({
  fields: z.array(z.object({ field: z.string(), message: z.string() })).optional(),
})

// Tamanho padrão e teto da página, para nenhuma listagem devolver o banco inteiro.
export const DEFAULT_PAGE_SIZE = 50
export const MAX_PAGE_SIZE = 100

// Query limit/offset das listagens; coerce porque a query string chega como texto.
export const paginationQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE)
    .describe(`Itens por página (padrão ${DEFAULT_PAGE_SIZE}, máximo ${MAX_PAGE_SIZE})`),
  offset: z.coerce.number().int().min(0).default(0).describe('Quantos itens pular'),
})

// Resposta paginada { items, total } para qualquer tipo de item.
export const pageSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int().describe('Total de itens que o usuário pode ver, sem paginação'),
  })

// Marca a rota como autenticada por JWT na documentação do /docs.
export const bearerAuth = [{ bearerAuth: [] }]
