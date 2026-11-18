import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ApiError, api, errorMessage, pageSize } from './api'

export function QueryStatus({ pending, error }: { pending: boolean; error: unknown }) {
  if (pending) return <p role="status">Carregando…</p>
  if (error) return <p role="alert">{errorMessage(error)}</p>
  return null
}

export function Pagination({
  offset,
  total,
  onChange,
}: {
  offset: number
  total: number
  onChange: (offset: number) => void
}) {
  if (total <= pageSize && offset === 0) return null
  return (
    <nav className="pagination" aria-label="Paginação">
      <button type="button" disabled={offset === 0} onClick={() => onChange(offset - pageSize)}>
        Anterior
      </button>
      <span>
        Página {offset / pageSize + 1} de {Math.max(1, Math.ceil(total / pageSize))}
      </span>
      <button
        type="button"
        disabled={offset + pageSize >= total}
        onClick={() => onChange(offset + pageSize)}
      >
        Próxima
      </button>
    </nav>
  )
}

export function RecordForm({
  title,
  path,
  resource,
  fields,
  children,
  method = 'POST',
}: {
  title: string
  path: string
  resource: string
  fields: (data: FormData) => unknown
  children: ReactNode
  method?: 'POST' | 'PATCH'
}) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (body: unknown) => api(path, { method, body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [resource] }),
  })

  return (
    <details className="record-form">
      <summary>{title}</summary>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (mutation.isPending) return
          const form = event.currentTarget
          mutation.mutate(fields(new FormData(form)), { onSuccess: () => form.reset() })
        }}
      >
        <fieldset disabled={mutation.isPending}>
          <legend>{title}</legend>
          {children}
          <button type="submit">{mutation.isPending ? 'Salvando…' : 'Salvar'}</button>
        </fieldset>
        {mutation.isSuccess && <p role="status">Dados salvos.</p>}
        {mutation.isError && (
          <div role="alert">
            <p>{errorMessage(mutation.error)}</p>
            {mutation.error instanceof ApiError && mutation.error.fields.length > 0 && (
              <ul>
                {mutation.error.fields.map(({ field, message }) => (
                  <li key={JSON.stringify([field, message])}>{message}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </form>
    </details>
  )
}
