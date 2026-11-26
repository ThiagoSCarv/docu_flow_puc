// Tela de backups (RF22–RF25): histórico paginado, filtro por situação e registro só para ADMIN.
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiError, fetchAll, pageSize, useCurrentUser, usePage } from '../../api'
import {
  Modal,
  Pagination,
  QueryStatus,
  RecordForm,
  StatusBadge,
  type StatusTone,
} from '../../components'
import './Backups.css'

// Situações de backup aceitas pelo servidor, com rótulo e cor do selo.
const statusLabels = {
  REALIZADO: 'Realizado',
  VERIFICADO: 'Verificado',
  FALHOU: 'Falhou',
}

type BackupStatus = keyof typeof statusLabels

const statusTones: Record<BackupStatus, StatusTone> = {
  REALIZADO: 'info',
  VERIFICADO: 'success',
  FALHOU: 'danger',
}

// Filtro especial "pendentes" (RF25) e o valor de ?situacao= usado pelo atalho do painel.
const PENDING_FILTER = 'PENDENTE'
const PENDING_QUERY_VALUE = 'pendentes'

type Backup = {
  id: string
  performedAt: string
  responsible: { name: string }
  scope: string
  status: BackupStatus
  notes: string | null
}

// Junta data e hora locais do formulário num ISO 8601; inválido vira erro mostrado no formulário.
function toBackupTimestamp(data: FormData) {
  const date = new Date(`${data.get('backupDate')}T${data.get('backupTime')}`)
  if (!Number.isFinite(date.getTime())) {
    throw new ApiError('Informe uma data e um horário válidos.', 400)
  }
  return date.toISOString()
}

function twoDigits(value: number) {
  return String(value).padStart(2, '0')
}

// Data e hora atuais no fuso local, nos formatos dos inputs date e time (valor padrão do registro).
function currentLocalDate() {
  const now = new Date()
  return `${now.getFullYear()}-${twoDigits(now.getMonth() + 1)}-${twoDigits(now.getDate())}`
}

function currentLocalTime() {
  const now = new Date()
  return `${twoDigits(now.getHours())}:${twoDigits(now.getMinutes())}`
}

function Backups() {
  const { data: user } = useCurrentUser()
  const [searchParams, setSearchParams] = useSearchParams()
  const [offset, setOffset] = useState(0)
  const [status, setStatus] = useState(() =>
    searchParams.get('situacao') === PENDING_QUERY_VALUE ? PENDING_FILTER : '',
  )
  const [creating, setCreating] = useState(false)
  // Situação comum filtra no cliente; "pendentes" e "todas" paginam no servidor.
  const filtersByStatus = Boolean(status) && status !== PENDING_FILTER
  const allBackups = useQuery({
    queryKey: ['backups', 'filter'],
    queryFn: ({ signal }) => fetchAll<Backup>('/backups', signal),
    enabled: filtersByStatus,
  })
  const page = usePage<Backup>(
    status === PENDING_FILTER ? 'backups/pending' : 'backups',
    offset,
    !filtersByStatus,
  )
  const query = filtersByStatus ? allBackups : page
  const matching = allBackups.data?.filter((backup) => backup.status === status)
  const items = filtersByStatus ? matching?.slice(offset, offset + pageSize) : page.data?.items
  const total = (filtersByStatus ? matching?.length : page.data?.total) ?? 0

  // Troca o filtro, volta à primeira página e reflete "pendentes" na URL sem criar histórico.
  const changeStatus = (value: string) => {
    setStatus(value)
    setOffset(0)
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params)
        if (value === PENDING_FILTER) next.set('situacao', PENDING_QUERY_VALUE)
        else next.delete('situacao')
        return next
      },
      { replace: true },
    )
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="breadcrumb">Página inicial / Backups</span>
          <h1>Backups</h1>
          <p>Consulte o histórico de registros de backup.</p>
        </div>
        {user?.role === 'ADMIN' && (
          <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
            <Plus size={18} aria-hidden="true" />
            Registrar backup
          </button>
        )}
      </div>

      {/* Modal de registro de backup (RF22), só para ADMIN. */}
      {user?.role === 'ADMIN' && (
        <Modal open={creating} onClose={() => setCreating(false)} title="Registrar backup">
          <RecordForm
            path="/backups"
            resource="backups"
            submitLabel="Registrar"
            onSuccess={() => setCreating(false)}
            onCancel={() => setCreating(false)}
            fields={(data) => ({
              performedAt: toBackupTimestamp(data),
              status: data.get('status'),
              scope: data.get('scope'),
              notes: data.get('notes') || undefined,
            })}
          >
            <div className="form-grid">
              <label>
                Data
                <input type="date" name="backupDate" defaultValue={currentLocalDate()} required />
              </label>
              <label>
                Hora
                <input type="time" name="backupTime" defaultValue={currentLocalTime()} required />
              </label>
              <label>
                Situação
                <select name="status">
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Abrangência
                <input name="scope" required maxLength={200} />
              </label>
              <label className="full">
                Observações
                <textarea name="notes" maxLength={500} />
              </label>
            </div>
          </RecordForm>
        </Modal>
      )}

      <div className="backups-toolbar">
        <label htmlFor="backup-status">Situação</label>
        <select
          id="backup-status"
          value={status}
          onChange={(event) => changeStatus(event.target.value)}
        >
          <option value="">Todas as situações</option>
          <option value="REALIZADO">Realizado</option>
          <option value="VERIFICADO">Verificado</option>
          <option value="FALHOU">Falhou</option>
          <option value={PENDING_FILTER}>Pendentes de verificação</option>
        </select>
        {status === PENDING_FILTER && (
          <p className="backups-toolbar-hint">
            Backups realizados depois da última verificação registrada.
          </p>
        )}
      </div>

      {/* Histórico de backups (RF24). */}
      <QueryStatus pending={query.isPending} error={query.error} />
      {items && (
        <>
          <p className="backups-count" role="status">
            {total === 1 ? '1 registro encontrado' : `${total} registros encontrados`}
          </p>

          <div className="backups-table-container">
            <table className="backups-table">
              <caption>Histórico de backups</caption>
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col">Responsável</th>
                  <th scope="col">Abrangência</th>
                  <th scope="col">Situação</th>
                  <th scope="col">Observações</th>
                </tr>
              </thead>

              <tbody>
                {items.map((backup) => (
                  <tr key={backup.id}>
                    <td>
                      <time dateTime={backup.performedAt}>
                        {new Date(backup.performedAt).toLocaleString('pt-BR', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </time>
                    </td>
                    <td>{backup.responsible.name}</td>
                    <td>{backup.scope}</td>
                    <td>
                      <StatusBadge tone={statusTones[backup.status]}>
                        {statusLabels[backup.status]}
                      </StatusBadge>
                    </td>
                    <td>{backup.notes || '—'}</td>
                  </tr>
                ))}

                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="backups-empty">
                      Nenhum registro encontrado para essa situação.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination offset={offset} total={total} onChange={setOffset} />
        </>
      )}
    </>
  )
}

export default Backups
