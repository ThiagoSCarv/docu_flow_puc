import { Database, FileText, FolderOpen, ShieldCheck, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

function Dashboard() {
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="breadcrumb">Página inicial / Dashboard</span>
          <h1>Dashboard</h1>
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
