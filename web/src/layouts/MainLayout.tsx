import {
  Activity,
  Bell,
  Database,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Search,
  ShieldCheck,
  UserCog,
  Users,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

import './MainLayout.css'

const menuItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Documentos', icon: FileText, path: '/documentos' },
  { label: 'Clientes', icon: Users, path: '/clientes' },
  { label: 'Usuários', icon: UserCog, path: '/usuarios' },
  { label: 'Backups', icon: Database, path: '/backups' },
  { label: 'Atividades', icon: Activity, path: '/atividades' },
  { label: 'Segurança', icon: ShieldCheck, path: '/seguranca' },
]

function MainLayout() {
  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <FolderOpen size={25} />
          </div>

          <div>
            <h2>OrganizaDoc</h2>
            <span>Gestão documental</span>
          </div>
        </div>

        <div className="menu-label">MENU PRINCIPAL</div>

        <nav className="sidebar-menu">
          {menuItems.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="user-avatar">AD</div>
            <div>
              <strong>Administrador</strong>
              <span>ADMIN</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="search-box">
            <Search size={18} />
            <input type="text" placeholder="Pesquisar no sistema..." />
          </div>

          <div className="topbar-actions">
            <button type="button" className="icon-button" aria-label="Notificações">
              <Bell size={20} />
            </button>

            <div className="header-profile">
              <div className="user-avatar">AD</div>
              <span>Administrador</span>
            </div>
          </div>
        </header>

        <section className="page-content">
          <Outlet />
        </section>
      </main>
    </div>
  )
}

export default MainLayout
