import fastifyStatic from '@fastify/static'
import type { FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'

const SPA_ENTRY_FILE = 'index.html'
const SERVER_OWNED_PREFIXES = ['/api', '/docs']
const SPA_METHODS = ['GET', 'HEAD']

type WebAppPluginOptions = {
  root: string
}

function belongsToServer(url: string) {
  return SERVER_OWNED_PREFIXES.some((prefix) => url === prefix || url.startsWith(`${prefix}/`))
}

function isSpaNavigation(request: FastifyRequest) {
  return SPA_METHODS.includes(request.method) && !belongsToServer(request.url)
}

export const webAppPlugin = fp<WebAppPluginOptions>(async (app, { root }) => {
  await app.register(fastifyStatic, { root, wildcard: false })

  app.setNotFoundHandler((request, reply) => {
    if (isSpaNavigation(request)) return reply.sendFile(SPA_ENTRY_FILE)
    return reply.code(404).send({ message: 'Rota não encontrada' })
  })
})
