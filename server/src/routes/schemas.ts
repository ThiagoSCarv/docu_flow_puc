import { z } from 'zod'

export const roleSchema = z.enum(['ADMIN', 'FUNCIONARIO', 'CONSULTA'])

export const publicUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  role: roleSchema,
  active: z.boolean(),
  createdAt: z.date(),
})

export const messageSchema = z.object({ message: z.string() })

export const passwordSchema = z
  .string()
  .min(8, 'A senha deve ter no mínimo 8 caracteres')
  .regex(/[A-Za-z]/, 'A senha deve conter letras')
  .regex(/[0-9]/, 'A senha deve conter números')

export const bearerAuth = [{ bearerAuth: [] }]
