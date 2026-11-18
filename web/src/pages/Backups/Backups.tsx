import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { fetchAll, pageSize, useCurrentUser, usePage } from '../../api'
import { Pagination, QueryStatus, RecordForm } from '../../components'
import './Backups.css'

const statusLabels = {
  REALIZADO: 'Realizado',
  VERIFICADO: 'Verificado',
  FALHOU: 'Falhou',
}

type BackupStatus = keyof typeof statusLabels

type Backup = {
  id: string
  performedAt: string
  responsible: { name: string }
  scope: string
  status: BackupStatus
  notes: string | null
}

function Backups() {
  const { data: user } = useCurrentUser()
  const [offset, setOffset] = useState(0)
  const [status, setStatus] = useState('')
  const allBackups = useQuery({
    queryKey: ['backups', 'filter'],
    queryFn: ({ signal }) => fetchAll<Backup>('/backups', signal),
    enabled: Boolean(status),
  })
  const page = usePage<Backup>('backups', offset, !status)
  const query = status ? allBackups : page
  const matching = allBackups.data?.filter((backup) => backup.status === status)
  const items = status ? matching?.slice(offset, offset + pageSize) : page.data?.items
  const total = (status ? matching?.length : page.data?.total) ?? 0

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="breadcrumb">Página inicial / Backups</span>
          <h1>Backups</h1>
          <p>Consulte o histórico de registros de backup.</p>
        </div>
      </div>

      {user?.role === 'ADMIN' && (
        <RecordForm
          title="Registrar backup"
          path="/backups"
          resource="backups"
          fields={(data) => ({
            performedAt: new Date(String(data.get('performedAt'))).toISOString(),
            status: data.get('status'),
            scope: data.get('scope'),
            notes: data.get('notes') || undefined,
          })}
        >
          <label>
            Data e hora
            <input name="performedAt" type="datetime-local" required />
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
          <label>
            Observações
            <textarea name="notes" maxLength={500} />
          </label>
        </RecordForm>
      )}

      <div className="backups-filter">
        <label htmlFor="backup-status">Situação</label>
        <select
          id="backup-status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            setOffset(0)
          }}
        >
          <option value="">Todas as situações</option>
          <option value="REALIZADO">Realizado</option>
          <option value="VERIFICADO">Verificado</option>
          <option value="FALHOU">Falhou</option>
        </select>
      </div>

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
                      <span
                        className={`backup-status backup-status-${backup.status.toLowerCase()}`}
                      >
                        {statusLabels[backup.status]}
                      </span>
                    </td>
                    <td>{backup.notes}</td>
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
