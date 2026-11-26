// Componentes compartilhados: estado de carga, modal, botões, selos, paginação e formulário.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  type LucideIcon,
  X,
} from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { ApiError, api, errorMessage, pageSize } from './api'

// Mostra "Carregando…" ou a mensagem de erro de uma consulta, com role para leitores de tela.
export function QueryStatus({ pending, error }: { pending: boolean; error: unknown }) {
  if (pending) return <p role="status">Carregando…</p>
  if (error) return <p role="alert">{errorMessage(error)}</p>
  return null
}

export type ModalSize = 'sm' | 'md' | 'lg'

// Modal com <dialog> nativo (foco preso, Esc); filhos só montam aberto, então o form volta limpo.
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  size?: ModalSize
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Sincroniza a prop open com showModal()/close() do elemento nativo.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // Fecha no clique no fundo só se o clique também começou nele (evita fechar ao arrastar seleção).
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    let pressedOnBackdrop = false
    const handlePointerDown = (event: PointerEvent) => {
      pressedOnBackdrop = event.target === dialog
    }
    const handleClick = (event: MouseEvent) => {
      if (pressedOnBackdrop && event.target === dialog) dialog.close()
      pressedOnBackdrop = false
    }
    dialog.addEventListener('pointerdown', handlePointerDown)
    dialog.addEventListener('click', handleClick)
    return () => {
      dialog.removeEventListener('pointerdown', handlePointerDown)
      dialog.removeEventListener('click', handleClick)
    }
  }, [])

  return (
    <dialog ref={dialogRef} className={`modal modal-${size}`} aria-label={title} onClose={onClose}>
      {open && (
        <div className="modal-content">
          <header className="modal-header">
            <h2>{title}</h2>
            <IconButton icon={X} label="Fechar" onClick={onClose} />
          </header>
          <div className="modal-body">{children}</div>
          {footer && <footer className="modal-footer">{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}

// Botão só com ícone; o label vira aria-label e dica; com href vira link externo em nova aba.
export function IconButton({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
  disabled = false,
  type = 'button',
  href,
}: {
  icon: LucideIcon
  label: string
  onClick?: () => void
  variant?: 'default' | 'danger'
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  href?: string
}) {
  const className = `icon-button${variant === 'danger' ? ' icon-button-danger' : ''}`
  const icon = <Icon size={18} aria-hidden="true" />

  if (href) {
    return (
      <a
        className={className}
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label={label}
        title={label}
      >
        {icon}
      </a>
    )
  }

  return (
    <button
      type={type}
      className={className}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  )
}

export type StatusTone = 'success' | 'danger' | 'neutral' | 'info' | 'warning'

// Selo de situação colorido, sempre com texto para não depender só da cor.
export function StatusBadge({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  return <span className={`status-badge status-badge-${tone}`}>{children}</span>
}

// Cor fixa por categoria conhecida; as demais caem no tom neutro (slate).
const categoryTones: Record<string, string> = {
  Administrativos: 'violet',
  Contratos: 'teal',
  Contábeis: 'blue',
  Financeiros: 'green',
  Fiscais: 'amber',
}

// Selo com o nome da categoria do documento (RF12).
export function CategoryBadge({ name }: { name: string }) {
  return (
    <span className={`category-badge category-badge-${categoryTones[name] ?? 'slate'}`}>
      {name}
    </span>
  )
}

// Até 5 páginas vizinhas da atual, ajustadas para não passar do início nem do fim.
function pageWindow(current: number, pageCount: number) {
  const windowSize = Math.min(5, pageCount)
  const start = Math.max(0, Math.min(current - 2, pageCount - windowSize))
  return Array.from({ length: windowSize }, (_, index) => start + index)
}

// Navegação « ‹ 1 2 3 › » por offset, com resumo "51–100 de 3.250"; some se houver uma página só.
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
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.floor(offset / pageSize)
  const lastPage = pageCount - 1
  const first = total === 0 ? 0 : offset + 1
  const last = Math.min(offset + pageSize, total)

  return (
    <nav className="pagination" aria-label="Paginação">
      <div className="pagination-pages">
        <IconButton
          icon={ChevronsLeft}
          label="Primeira página"
          disabled={current === 0}
          onClick={() => onChange(0)}
        />
        <IconButton
          icon={ChevronLeft}
          label="Página anterior"
          disabled={current === 0}
          onClick={() => onChange((current - 1) * pageSize)}
        />
        {pageWindow(current, pageCount).map((page) => (
          <button
            key={page}
            type="button"
            className="pagination-page"
            aria-current={page === current ? 'page' : undefined}
            aria-label={`Página ${page + 1}`}
            onClick={() => onChange(page * pageSize)}
          >
            {(page + 1).toLocaleString('pt-BR')}
          </button>
        ))}
        <IconButton
          icon={ChevronRight}
          label="Próxima página"
          disabled={current >= lastPage}
          onClick={() => onChange((current + 1) * pageSize)}
        />
        <IconButton
          icon={ChevronsRight}
          label="Última página"
          disabled={current >= lastPage}
          onClick={() => onChange(lastPage * pageSize)}
        />
      </div>
      <span className="pagination-summary">
        {first.toLocaleString('pt-BR')}–{last.toLocaleString('pt-BR')} de{' '}
        {total.toLocaleString('pt-BR')}
      </span>
    </nav>
  )
}

// Botão que faz um PATCH e atualiza a lista do recurso; com confirm pede confirmação num modal.
export function ActionButton({
  label,
  path,
  body,
  resource,
  icon,
  variant = 'default',
  confirm,
}: {
  label: string
  path: string
  body: unknown
  resource: string
  icon?: LucideIcon
  variant?: 'default' | 'danger'
  confirm?: string
}) {
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const mutation = useMutation({
    mutationFn: () => api(path, { method: 'PATCH', body }),
    onSuccess: () => {
      setConfirming(false)
      return queryClient.invalidateQueries({ queryKey: [resource] })
    },
  })

  // Abre a confirmação quando exigida; senão envia direto.
  const trigger = () => {
    if (confirm) setConfirming(true)
    else mutation.mutate()
  }

  return (
    <span className="action-button">
      {icon ? (
        <IconButton
          icon={icon}
          label={label}
          variant={variant}
          disabled={mutation.isPending}
          onClick={trigger}
        />
      ) : (
        <button
          type="button"
          className={variant === 'danger' ? 'btn-danger' : 'btn-secondary'}
          disabled={mutation.isPending}
          onClick={trigger}
        >
          {mutation.isPending ? 'Salvando…' : label}
        </button>
      )}
      {!confirming && mutation.isError && <span role="alert">{errorMessage(mutation.error)}</span>}
      {confirm && (
        <Modal
          open={confirming}
          onClose={() => setConfirming(false)}
          title={label}
          size="sm"
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={() => setConfirming(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className={variant === 'danger' ? 'btn-danger' : 'btn-primary'}
                disabled={mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? 'Salvando…' : label}
              </button>
            </>
          }
        >
          <p>{confirm}</p>
          {mutation.isError && <p role="alert">{errorMessage(mutation.error)}</p>}
        </Modal>
      )}
    </span>
  )
}

// Formulário que envia POST/PATCH, invalida a lista e mostra os erros por campo vindos da API.
export function RecordForm({
  path,
  resource,
  method = 'POST',
  fields,
  children,
  submitLabel = 'Salvar',
  onSuccess,
  onCancel,
}: {
  path: string
  resource: string
  method?: 'POST' | 'PATCH'
  fields: (data: FormData) => unknown
  children: ReactNode
  submitLabel?: string
  onSuccess?: () => void
  onCancel?: () => void
}) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (data: FormData) => api(path, { method, body: fields(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [resource] }),
  })

  return (
    <form
      className="form"
      onSubmit={(event) => {
        event.preventDefault()
        // Ignora envio duplo; no sucesso limpa os campos e avisa a tela (ex.: fechar o modal).
        if (mutation.isPending) return
        const form = event.currentTarget
        mutation.mutate(new FormData(form), {
          onSuccess: () => {
            form.reset()
            onSuccess?.()
          },
        })
      }}
    >
      <fieldset className="form-fields" disabled={mutation.isPending}>
        {children}
      </fieldset>
      {mutation.isSuccess && !onSuccess && <p role="status">Dados salvos.</p>}
      {mutation.isError && (
        <div className="form-error" role="alert">
          <p>{errorMessage(mutation.error)}</p>
          {mutation.error instanceof ApiError && mutation.error.fields.length > 0 && (
            <ul>
              {mutation.error.fields.map(({ field, message }) => (
                <li key={JSON.stringify([field, message])} className="field-error">
                  {message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="form-footer">
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" className="btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? 'Salvando…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
