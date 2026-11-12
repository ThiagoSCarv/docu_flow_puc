import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import type { ListSecurityGuidelinesUseCase } from '../../../application/awareness/list-security-guidelines.use-case.js'
import { bearerAuth, messageSchema, securityGuidelineSchema } from '../schemas.js'

type SecurityGuidelineRoutesOptions = {
  listSecurityGuidelines: ListSecurityGuidelinesUseCase
}

export const securityGuidelineRoutes: FastifyPluginAsyncZod<
  SecurityGuidelineRoutesOptions
> = async (app, { listSecurityGuidelines }) => {
  app.get(
    '/security-guidelines',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['security-guidelines'],
        summary: 'Orientações de segurança contra golpes e vazamento de dados',
        security: bearerAuth,
        response: { 200: z.array(securityGuidelineSchema), 401: messageSchema },
      },
    },
    () =>
      listSecurityGuidelines
        .execute()
        .map((guideline) => ({ ...guideline, practices: [...guideline.practices] })),
  )
}
