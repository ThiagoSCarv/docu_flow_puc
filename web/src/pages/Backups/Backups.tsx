import { useState } from 'react'
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
  responsible: string
  scope: string
  status: BackupStatus
  notes: string
}

const backups: Backup[] = [
  {
    id: '1',
    performedAt: '2026-11-10',
    responsible: 'Colaborador A',
    scope: 'Documentos contábeis',
    status: 'VERIFICADO',
    notes: 'Recuperação de uma cópia de teste conferida.',
  },
  {
    id: '2',
    performedAt: '2026-11-11',
    responsible: 'Colaborador B',
    scope: 'Documentos fiscais',
    status: 'REALIZADO',
    notes: 'Aguardando verificação da recuperação.',
  },
  {
    id: '3',
    performedAt: '2026-11-12',
    responsible: 'Colaborador A',
    scope: 'Documentos administrativos',
    status: 'FALHOU',
    notes: 'Falha simulada de conexão durante a cópia.',
  },
]

function Backups() {
  const [status, setStatus] = useState('')

  const filteredBackups = backups.filter((backup) => status === '' || backup.status === status)

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="breadcrumb">Página inicial / Backups</span>
          <h1>Backups</h1>
          <p>Consulte o histórico de registros de backup.</p>
        </div>
      </div>

      <p className="backups-notice">
        Dados fictícios para demonstração. O OrganizaDoc acompanha registros e não executa cópias ou
        verifica arquivos automaticamente.
      </p>

      <div className="backups-filter">
        <label htmlFor="backup-status">Situação</label>
        <select
          id="backup-status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">Todas as situações</option>
          <option value="REALIZADO">Realizado</option>
          <option value="VERIFICADO">Verificado</option>
          <option value="FALHOU">Falhou</option>
        </select>
      </div>

      <p className="backups-count" role="status">
        {filteredBackups.length === 1
          ? '1 registro encontrado'
          : `${filteredBackups.length} registros encontrados`}
      </p>

      <div className="backups-table-container">
        <table className="backups-table">
          <caption>Histórico de backups — dados fictícios</caption>
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
            {filteredBackups.map((backup) => (
              <tr key={backup.id}>
                <td>
                  <time dateTime={backup.performedAt}>
                    {backup.performedAt.split('-').reverse().join('/')}
                  </time>
                </td>
                <td>{backup.responsible}</td>
                <td>{backup.scope}</td>
                <td>
                  <span className={`backup-status backup-status-${backup.status.toLowerCase()}`}>
                    {statusLabels[backup.status]}
                  </span>
                </td>
                <td>{backup.notes}</td>
              </tr>
            ))}

            {filteredBackups.length === 0 && (
              <tr>
                <td colSpan={5} className="backups-empty">
                  Nenhum registro encontrado para essa situação.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default Backups
