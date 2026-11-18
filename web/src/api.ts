import { useQuery } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'

export type Role = 'ADMIN' | 'FUNCIONARIO' | 'CONSULTA'
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
export type Page<T> = { items: T[]; total: number }

type FieldError = { field: string; message: string }

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fields: FieldError[] = [],
  ) {
    super(message)
  }
}

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

export function useToken() {
  return useSyncExternalStore(subscribe, readToken)
}

export function setToken(token: string | null) {
  if (token) sessionStorage.setItem(sessionKey, token)
  else sessionStorage.removeItem(sessionKey)
  for (const listener of listeners) listener()
}

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

export function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'Não foi possível conectar ao servidor.'
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['current-user'],
    queryFn: ({ signal }) => api<User>('/auth/me', { signal }),
    staleTime: 60_000,
  })
}

export const pageSize = 50

export function usePage<T>(resource: string, offset: number, enabled = true) {
  return useQuery({
    queryKey: [resource, offset],
    queryFn: ({ signal }) =>
      api<Page<T>>(`/${resource}?limit=${pageSize}&offset=${offset}`, { signal }),
    enabled,
  })
}

export async function fetchAll<T>(path: string, signal: AbortSignal) {
  const items: T[] = []
  for (let offset = 0; ; offset += 100) {
    const page = await api<Page<T>>(`${path}?limit=100&offset=${offset}`, { signal })
    items.push(...page.items)
    if (page.items.length < 100 || offset + 100 >= page.total) return items
  }
}

export function useClientOptions(enabled = true) {
  return useQuery({
    queryKey: ['clients', 'options'],
    queryFn: ({ signal }) => fetchAll<Client>('/clients', signal),
    enabled,
  })
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: ({ signal }) => api<Category[]>('/categories', { signal }),
  })
}
