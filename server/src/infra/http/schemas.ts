import { z } from 'zod'
import { BackupStatus, UserRole } from '../../shared/utils/enums.js'

export const roleSchema = z.enum(UserRole)

export const userSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  role: roleSchema,
  active: z.boolean(),
  createdAt: z.date(),
  allowedCategoryIds: z.array(z.uuid()),
})

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

export const categorySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  code: z.string(),
})

export const clientSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  code: z.string(),
  active: z.boolean(),
})

export const backupStatusSchema = z.enum(BackupStatus)

export const backupSchema = z.object({
  id: z.uuid(),
  performedAt: z.date(),
  status: backupStatusSchema,
  scope: z.string(),
  notes: z.string().nullable(),
  responsible: z.object({ id: z.uuid(), name: z.string() }),
})

export const securityGuidelineSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  practices: z.array(z.string()),
})

export const messageSchema = z.object({ message: z.string() })

export const badRequestSchema = messageSchema.extend({
  fields: z.array(z.object({ field: z.string(), message: z.string() })).optional(),
})

export const DEFAULT_PAGE_SIZE = 50
export const MAX_PAGE_SIZE = 100

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

export const pageSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int().describe('Total de itens que o usuário pode ver, sem paginação'),
  })

export const bearerAuth = [{ bearerAuth: [] }]
