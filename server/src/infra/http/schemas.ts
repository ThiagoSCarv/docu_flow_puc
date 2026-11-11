import { z } from 'zod'
import { UserRole } from '../../shared/utils/enums.js'

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

export const messageSchema = z.object({ message: z.string() })

export const bearerAuth = [{ bearerAuth: [] }]
