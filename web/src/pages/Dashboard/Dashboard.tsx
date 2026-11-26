import { useQuery } from '@tanstack/react-query'
import { Database, FileText, FolderOpen, ShieldCheck, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, useCategories } from '../../api'
import { QueryStatus } from '../../components'

type DashboardData = {
  documents: { total: number; byCategory: { categoryId: string; total: number }[] }
  clients: { active: number; inactive: number }
  backups: {
    pendingVerification: number
    latest: { performedAt: string; status: string; responsible: { name: string } } | null
  }
}

const backupStatusLabels: Record<string, string> = {
  REALIZADO: 'Realizado',
  VERIFICADO: 'Verificado',
  FALHOU: 'Falhou',
}

function Indicators() {
  const categories = useCategories()
  const dashboard = useQuery({
    queryKey: ['dashboard'],
    queryFn: ({ signal }) => api<DashboardData>('/dashboard', { signal }),
  })
  const categoryName = (id: string) =>
    categories.data?.find((category) => category.id === id)?.name ?? 'Categoria'

  if (!dashboard.data) return <QueryStatus pending={dashboard.isPending} error={dashboard.error} />
  const { documents, clients, backups } = dashboard.data

  return (
    <>
      <div className="quick-access">
        <div className="quick-card">
          <FileText size={25} />
          <h3>{documents.total} documentos</h3>
          <p>Nas categorias que você pode ver.</p>
        </div>
        <div className="quick-card">
          <Users size={25} />
          <h3>{clients.active} clientes ativos</h3>
          <p>{clients.inactive} inativo(s), com documentos mantidos.</p>
        </div>
        <Link to="/backups" className="quick-card">
          <Database size={25} />
          <h3>{backups.pendingVerification} backup(s) pendente(s)</h3>
          <p>Realizados depois da última verificação.</p>
        </Link>
        <div className="quick-card">
          <Database size={25} />
          <h3>Último backup</h3>
          <p>
            {backups.latest
              ? `${new Date(backups.latest.performedAt).toLocaleString('pt-BR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })} · ${backupStatusLabels[backups.latest.status] ?? backups.latest.status} · ${backups.latest.responsible.name}`
              : 'Nenhum backup registrado.'}
          </p>
        </div>
      </div>

      {documents.byCategory.length > 0 && (
        <ul className="category-totals">
          {documents.byCategory.map(({ categoryId, total }) => (
            <li key={categoryId}>
              <span>{categoryName(categoryId)}</span>
              <strong>{total}</strong>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function Dashboard() {
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="breadcrumb">Página inicial</span>
          <h1>Início</h1>
          <p>Bem-vindo ao OrganizaDoc.</p>
        </div>
      </div>

      <div className="welcome-card">
        <div>
          <span className="welcome-tag">ORGANIZAÇÃO E SEGURANÇA</span>
          <h2>Seja bem-vindo ao OrganizaDoc!</h2>
          <p>
            Organize, consulte e acompanhe as informações dos documentos digitais do escritório.
          </p>
        </div>

        <FolderOpen size={65} strokeWidth={1.3} />
      </div>

      <div className="section-heading">
        <h2>Indicadores</h2>
        <span>Situação atual do catálogo e dos backups</span>
      </div>

      <Indicators />

      <div className="section-heading">
        <h2>Acesso rápido</h2>
        <span>Principais áreas do sistema</span>
      </div>

      <div className="quick-access">
        <Link to="/documentos" className="quick-card">
          <FileText size={25} />
          <h3>Documentos</h3>
          <p>Consulte e organize documentos.</p>
        </Link>

        <Link to="/clientes" className="quick-card">
          <Users size={25} />
          <h3>Clientes</h3>
          <p>Consulte os clientes cadastrados.</p>
        </Link>

        <Link to="/backups" className="quick-card">
          <Database size={25} />
          <h3>Backups</h3>
          <p>Acompanhe os registros de backup.</p>
        </Link>

        <Link to="/seguranca" className="quick-card">
          <ShieldCheck size={25} />
          <h3>Segurança</h3>
          <p>Confira orientações de proteção.</p>
        </Link>
      </div>
    </>
  )
}

export default Dashboard
