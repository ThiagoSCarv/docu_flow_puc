// Raiz do front: cria o cache do TanStack Query e define as rotas protegidas por sessão e perfil.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { ApiError, errorMessage, useCurrentUser, useToken } from './api'
import MainLayout from './layouts/MainLayout'
import Access from './pages/Access/Access'
import Activities from './pages/Activities/Activities'
import Backups from './pages/Backups/Backups'
import Clients from './pages/Clients/Clients'
import Dashboard from './pages/Dashboard/Dashboard'
import Documents from './pages/Documents/Documents'
import Login from './pages/Login/Login'
import Security from './pages/Security/Security'
import Users from './pages/Users/Users'

// Página simples só com título, usada para rota inexistente e acesso negado.
function PendingPage({ title }: { title: string }) {
  return <h1>{title}</h1>
}

// Sem token manda ao login guardando a rota de origem para voltar depois de entrar.
function RequireSession({ token }: { token: string | null }) {
  const location = useLocation()
  return token ? <SessionCheck /> : <Navigate to="/login" replace state={{ from: location }} />
}

// Confirma o token no servidor (GET /auth/me) antes de liberar as telas internas.
function SessionCheck() {
  const user = useCurrentUser()
  if (user.isPending) return <p role="status">Verificando sessão…</p>
  if (user.isError) {
    return (
      <main className="page-content">
        <p role="alert">{errorMessage(user.error)}</p>
        <button type="button" onClick={() => user.refetch()}>
          Tentar novamente
        </button>
      </main>
    )
  }
  return <Outlet />
}

// Esconde as rotas de ADMIN dos outros perfis; o servidor recusa de qualquer forma (RNF05).
function AdminRoute() {
  const user = useCurrentUser()
  return user.data?.role === 'ADMIN' ? <Outlet /> : <PendingPage title="Acesso restrito" />
}

function SessionRoutes({ token }: { token: string | null }) {
  // Erros da API (4xx/5xx) não são repetidos; só falha de rede ganha uma nova tentativa.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: (count, error) => !(error instanceof ApiError) && count < 1 },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      {/* Login é público; o resto exige sessão válida e algumas rotas exigem ADMIN. */}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireSession token={token} />}>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="documentos" element={<Documents />} />
            <Route path="clientes" element={<Clients />} />
            <Route element={<AdminRoute />}>
              <Route path="usuarios" element={<Users />} />
              <Route path="acessos" element={<Access />} />
              <Route path="atividades" element={<Activities />} />
            </Route>
            <Route path="backups" element={<Backups />} />
            <Route path="seguranca" element={<Security />} />
            <Route path="*" element={<PendingPage title="Página não encontrada" />} />
          </Route>
        </Route>
      </Routes>
    </QueryClientProvider>
  )
}

// A key com o token recria o cache a cada login/logout, sem vazar dados de outra sessão.
function App() {
  const token = useToken()
  return (
    <BrowserRouter>
      <SessionRoutes key={token} token={token} />
    </BrowserRouter>
  )
}

export default App
