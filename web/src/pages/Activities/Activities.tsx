import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api, type Page, pageSize } from '../../api'
import { Pagination, QueryStatus } from '../../components'
import '../Clients/Clients.css'

const actionLabels = {
  LOGIN_SUCESSO: 'Login realizado',
  LOGIN_FALHA: 'Login recusado',
  LOGIN_BLOQUEADO: 'Conta bloqueada',
  USUARIO_CRIADO: 'Usuário cadastrado',
  USUARIO_INATIVADO: 'Usuário inativado',
  USUARIO_REATIVADO: 'Usuário reativado',
  PERMISSAO_ALTERADA: 'Permissões alteradas',
  SENHA_REDEFINIDA: 'Senha redefinida',
  CLIENTE_CRIADO: 'Cliente cadastrado',
  CLIENTE_ALTERADO: 'Cliente editado',
  CLIENTE_INATIVADO: 'Cliente inativado',
  CLIENTE_REATIVADO: 'Cliente reativado',
  BACKUP_REGISTRADO: 'Backup registrado',
  DOCUMENTO_CRIADO: 'Documento cadastrado',
}

type Action = keyof typeof actionLabels

type ActivityLog = {
  id: string
  action: Action
  createdAt: string
  ip: string | null
  user: { id: string; name: string } | null
}

function Activities() {
  const [action, setAction] = useState('')
  const [offset, setOffset] = useState(0)
  const params = new URLSearchParams({ limit: String(pageSize), offset: String(offset) })
  if (action) params.set('action', action)
  const logs = useQuery({
    queryKey: ['activity-logs', action, offset],
    queryFn: ({ signal }) => api<Page<ActivityLog>>(`/activity-logs?${params}`, { signal }),
  })

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="breadcrumb">Página inicial / Atividades</span>
          <h1>Atividades</h1>
          <p>Acompanhe logins, cadastros e mudanças de acesso, do mais recente ao mais antigo.</p>
        </div>
      </div>

      <div className="clients-filter">
        <label htmlFor="activity-action">Ação</label>
        <select
          id="activity-action"
          value={action}
          onChange={(event) => {
            setAction(event.target.value)
            setOffset(0)
          }}
        >
          <option value="">Todas as ações</option>
          {Object.entries(actionLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <QueryStatus pending={logs.isPending} error={logs.error} />
      {logs.data && (
        <>
          <p className="clients-count" role="status">
            {logs.data.total === 1 ? '1 registro' : `${logs.data.total} registros`}
          </p>
          <div className="clients-table-container">
            <table className="clients-table">
              <caption>Log de atividades</caption>
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col">Quem</th>
                  <th scope="col">Ação</th>
                  <th scope="col">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.data.items.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <time dateTime={log.createdAt}>
                        {new Date(log.createdAt).toLocaleString('pt-BR', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </time>
                    </td>
                    <td>{log.user?.name ?? 'Não identificado'}</td>
                    <td>{actionLabels[log.action] ?? log.action}</td>
                    <td>{log.ip}</td>
                  </tr>
                ))}
                {logs.data.items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="clients-empty">
                      Nenhum registro para essa ação.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination offset={offset} total={logs.data.total} onChange={setOffset} />
        </>
      )}
    </>
  )
}

export default Activities
