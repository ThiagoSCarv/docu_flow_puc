import { BrowserRouter, Route, Routes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Backups from './pages/Backups/Backups'
import Clients from './pages/Clients/Clients'
import Dashboard from './pages/Dashboard/Dashboard'
import Documents from './pages/Documents/Documents'
import Login from './pages/Login/Login'
import Security from './pages/Security/Security'

function PendingPage({ title }: { title: string }) {
  return (
    <div className="page-heading">
      <div>
        <span className="breadcrumb">Página inicial / {title}</span>
        <h1>{title}</h1>
        <p>Esta página será desenvolvida nas próximas etapas.</p>
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="documentos" element={<Documents />} />
          <Route path="clientes" element={<Clients />} />
          <Route path="usuarios" element={<PendingPage title="Usuários" />} />
          <Route path="backups" element={<Backups />} />
          <Route path="atividades" element={<PendingPage title="Atividades" />} />
          <Route path="seguranca" element={<Security />} />
          <Route path="*" element={<PendingPage title="Página não encontrada" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
