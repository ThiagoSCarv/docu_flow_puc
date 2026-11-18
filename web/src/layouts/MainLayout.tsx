import {
  Database,
  FileText,
  FolderOpen,
  LayoutDashboard,
  ShieldCheck,
  UserCog,
  Users,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

import { setToken, useCurrentUser } from '../api'
import './MainLayout.css'

const menuItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Documentos', icon: FileText, path: '/documentos' },
  { label: 'Clientes', icon: Users, path: '/clientes' },
  { label: 'Usuários', icon: UserCog, path: '/usuarios' },
  { label: 'Backups', icon: Database, path: '/backups' },
  { label: 'Segurança', icon: ShieldCheck, path: '/seguranca' },
]

function MainLayout() {
  const { data: user } = useCurrentUser()
  const initials = user?.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
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
          {menuItems
            .filter((item) => item.path !== '/usuarios' || user?.role === 'ADMIN')
            .map((item) => {
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
            <div className="user-avatar">{initials}</div>
            <div>
              <strong>{user?.name}</strong>
              <span>{user?.role}</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-actions">
            <button type="button" className="icon-button" onClick={() => setToken(null)}>
              Sair
            </button>

            <div className="header-profile">
              <div className="user-avatar">{initials}</div>
              <span>{user?.name}</span>
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
