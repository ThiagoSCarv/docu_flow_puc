// Tela inicial (RF29): boas-vindas, indicadores do catálogo e dos backups e atalhos para as áreas.
import { useQuery } from '@tanstack/react-query'
import { Database, FileText, FolderOpen, ShieldCheck, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, useCategories } from '../../api'
import { CategoryBadge, QueryStatus } from '../../components'
import './Dashboard.css'

// Resposta de GET /dashboard, já restrita às categorias que o usuário pode ver.
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

// Números com separador de milhar brasileiro (3.250).
const formatNumber = (value: number) => value.toLocaleString('pt-BR')

// Cartões de indicadores e total de documentos por categoria.
function Indicators() {
  const categories = useCategories()
  const dashboard = useQuery({
    queryKey: ['dashboard'],
    queryFn: ({ signal }) => api<DashboardData>('/dashboard', { signal }),
  })
  // O painel traz só o id da categoria; o nome vem da lista de categorias.
  const categoryName = (id: string) =>
    categories.data?.find((category) => category.id === id)?.name ?? 'Categoria'

  if (!dashboard.data) return <QueryStatus pending={dashboard.isPending} error={dashboard.error} />
  const { documents, clients, backups } = dashboard.data
  const pending = backups.pendingVerification

  return (
    <>
      <div className="quick-access">
        <div className="quick-card stat-card">
          <FileText size={25} aria-hidden="true" />
          <strong className="stat-value">{formatNumber(documents.total)}</strong>
          <span className="stat-label">documentos</span>
          <p>Nas categorias que você pode ver.</p>
        </div>
        <div className="quick-card stat-card">
          <Users size={25} aria-hidden="true" />
          <strong className="stat-value">{formatNumber(clients.active)}</strong>
          <span className="stat-label">clientes ativos</span>
          <p>{formatNumber(clients.inactive)} inativo(s), com documentos mantidos.</p>
        </div>
        {/* Com pendências, o cartão vira atalho para a lista filtrada de backups (RF25). */}
        {pending > 0 ? (
          <Link to="/backups?situacao=pendentes" className="quick-card stat-card stat-card-warning">
            <Database size={25} aria-hidden="true" />
            <strong className="stat-value">{formatNumber(pending)}</strong>
            <span className="stat-label">backups pendentes</span>
            <p>Realizados depois da última verificação.</p>
          </Link>
        ) : (
          <div className="quick-card stat-card stat-card-success">
            <Database size={25} aria-hidden="true" />
            <strong className="stat-value">0</strong>
            <span className="stat-label">Nenhum backup pendente</span>
            <p>Todos os backups foram verificados.</p>
          </div>
        )}
        <div className="quick-card stat-card">
          <Database size={25} aria-hidden="true" />
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
              <CategoryBadge name={categoryName(categoryId)} />
              <strong className="category-total">{formatNumber(total)}</strong>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

// Página inicial: monta as seções de boas-vindas, indicadores e acesso rápido.
function Dashboard() {
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="breadcrumb">Página inicial</span>
          <h1>Início</h1>
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

        <FolderOpen size={65} strokeWidth={1.3} aria-hidden="true" />
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
        <Link to="/documentos" className="quick-card quick-link">
          <FileText size={25} aria-hidden="true" />
          <h3>Documentos</h3>
          <p>Consulte e organize documentos.</p>
        </Link>

        <Link to="/clientes" className="quick-card quick-link">
          <Users size={25} aria-hidden="true" />
          <h3>Clientes</h3>
          <p>Consulte os clientes cadastrados.</p>
        </Link>

        <Link to="/backups" className="quick-card quick-link">
          <Database size={25} aria-hidden="true" />
          <h3>Backups</h3>
          <p>Acompanhe os registros de backup.</p>
        </Link>

        <Link to="/seguranca" className="quick-card quick-link">
          <ShieldCheck size={25} aria-hidden="true" />
          <h3>Segurança</h3>
          <p>Confira orientações de proteção.</p>
        </Link>
      </div>
    </>
  )
}

export default Dashboard
