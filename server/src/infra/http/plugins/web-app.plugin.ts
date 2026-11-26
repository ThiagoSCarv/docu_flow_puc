// Infra HTTP: serve o build do React na mesma origem HTTPS da API, sem CORS (RNF06).
import fastifyStatic from '@fastify/static'
import type { FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'

// Arquivo de entrada do React e prefixos que pertencem ao servidor, não ao front.
const SPA_ENTRY_FILE = 'index.html'
const SERVER_OWNED_PREFIXES = ['/api', '/docs']
const SPA_METHODS = ['GET', 'HEAD']

type WebAppPluginOptions = {
  root: string
}

// Diz se a URL é da API ou do Swagger, que nunca devem cair no index.html.
function belongsToServer(url: string) {
  return SERVER_OWNED_PREFIXES.some((prefix) => url === prefix || url.startsWith(`${prefix}/`))
}

// Navegação do React Router: GET/HEAD fora das rotas do servidor.
function isSpaNavigation(request: FastifyRequest) {
  return SPA_METHODS.includes(request.method) && !belongsToServer(request.url)
}

export const webAppPlugin = fp<WebAppPluginOptions>(async (app, { root }) => {
  await app.register(fastifyStatic, { root, wildcard: false })

  // Fallback: rotas do front recebem o index.html; o resto responde 404 em JSON.
  app.setNotFoundHandler((request, reply) => {
    if (isSpaNavigation(request)) return reply.sendFile(SPA_ENTRY_FILE)
    return reply.code(404).send({ message: 'Rota não encontrada' })
  })
})
