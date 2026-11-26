// Cliente da API: tipos compartilhados, token da sessão, fetch autenticado e hooks de consulta.
import { useQuery } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'

// Perfis de acesso (RF05) e seus rótulos em português para a tela.
export type Role = 'ADMIN' | 'FUNCIONARIO' | 'CONSULTA'
export const roleLabels: Record<Role, string> = {
  ADMIN: 'Administrador',
  FUNCIONARIO: 'Funcionário',
  CONSULTA: 'Consulta',
}

// Formatos das respostas da API, espelhando os schemas do servidor.
export type User = {
  id: string
  name: string
  email: string
  role: Role
  active: boolean
  allowedCategoryIds: string[]
}
export type Client = { id: string; name: string; code: string; active: boolean }
export type Category = { id: string; name: string }
export type Document = {
  id: string
  name: string
  clientId: string
  categoryId: string
  period: string
  cloudLocation: string
}
// Resposta das listagens paginadas: itens da página e total com os filtros aplicados.
export type Page<T> = { items: T[]; total: number }

type FieldError = { field: string; message: string }

// Erro com status HTTP e erros por campo, para a tela distinguir falha da API de falha de rede.
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fields: FieldError[] = [],
  ) {
    super(message)
  }
}

// Token na sessionStorage: some ao fechar a aba; os listeners avisam o React quando ele muda.
const sessionKey = 'organizadoc.session'
const listeners = new Set<() => void>()

function readToken() {
  return sessionStorage.getItem(sessionKey)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// Lê o token como estado externo, re-renderizando quem usa a cada login ou logout.
export function useToken() {
  return useSyncExternalStore(subscribe, readToken)
}

// Grava ou apaga o token e notifica os componentes inscritos.
export function setToken(token: string | null) {
  if (token) sessionStorage.setItem(sessionKey, token)
  else sessionStorage.removeItem(sessionKey)
  for (const listener of listeners) listener()
}

// Chama /api por caminho relativo (mesma origem HTTPS) com Bearer e JSON; erro vira ApiError.
export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal; public?: boolean } = {},
): Promise<T> {
  const token = options.public ? null : readToken()
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')

  const response = await fetch(`/api${path}`, {
    method: options.method,
    signal: options.signal,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (!response.ok) {
    // Token expirado (RNF14) encerra a sessão, mas só se ainda for o token usado na chamada.
    if (response.status === 401 && token && token === readToken()) setToken(null)
    const error = await response.json().catch(() => null)
    const message =
      response.status === 429
        ? 'Muitas tentativas. Aguarde antes de tentar novamente.'
        : (error?.message ?? 'Não foi possível concluir a solicitação.')
    throw new ApiError(message, response.status, error?.fields)
  }

  return response.status === 204 ? (undefined as T) : response.json()
}

// Mensagem para o usuário: a do servidor quando houver, senão aviso genérico de conexão.
export function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'Não foi possível conectar ao servidor.'
}

// Usuário logado com perfil e categorias permitidas, guardado em cache por um minuto.
export function useCurrentUser() {
  return useQuery({
    queryKey: ['current-user'],
    queryFn: ({ signal }) => api<User>('/auth/me', { signal }),
    staleTime: 60_000,
  })
}

export const pageSize = 50

// Página de uma listagem; a chave dividida por "/" permite invalidar o recurso pai de uma vez.
export function usePage<T>(resource: string, offset: number, enabled = true) {
  return useQuery({
    queryKey: [...resource.split('/'), offset],
    queryFn: ({ signal }) =>
      api<Page<T>>(`/${resource}?limit=${pageSize}&offset=${offset}`, { signal }),
    enabled,
  })
}

// Percorre todas as páginas de 100 (o máximo da API) para montar listas completas e filtros locais.
export async function fetchAll<T>(path: string, signal: AbortSignal) {
  const items: T[] = []
  for (let offset = 0; ; offset += 100) {
    const page = await api<Page<T>>(`${path}?limit=100&offset=${offset}`, { signal })
    items.push(...page.items)
    if (page.items.length < 100 || offset + 100 >= page.total) return items
  }
}

// Todos os clientes, para preencher selects de cliente nos formulários e filtros.
export function useClientOptions(enabled = true) {
  return useQuery({
    queryKey: ['clients', 'options'],
    queryFn: ({ signal }) => fetchAll<Client>('/clients', signal),
    enabled,
  })
}

// Categorias de documento (lista curta, sem paginação).
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: ({ signal }) => api<Category[]>('/categories', { signal }),
  })
}
