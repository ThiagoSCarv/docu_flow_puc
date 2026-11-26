// Tela de login (RF02): e-mail e senha; mostra a mensagem genérica do servidor em caso de erro.
import { useMutation } from '@tanstack/react-query'
import { Eye, EyeOff, FolderOpen } from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { api, errorMessage, setToken, useToken } from '../../api'
import './Login.css'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const token = useToken()
  const location = useLocation()
  // Chamada pública (sem Bearer); o token recebido abre a sessão.
  const login = useMutation({
    mutationFn: () =>
      api<{ token: string }>('/auth/login', {
        method: 'POST',
        body: { email, password },
        public: true,
      }),
    onSuccess: ({ token }) => setToken(token),
  })

  // Já logado: volta para a página que pediu login, ou para o início.
  if (token) return <Navigate to={location.state?.from ?? '/'} replace />

  // Evita envio duplo enquanto a tentativa anterior não termina.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!login.isPending) login.mutate()
  }
  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <div className="login-brand-icon">
            <FolderOpen size={30} aria-hidden="true" />
          </div>
          <span>OrganizaDoc</span>
        </div>

        <h1 id="login-title">Acesse sua conta</h1>
        <p className="login-description">
          Consulte e organize os registros de documentos do escritório.
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="login-email">E-mail</label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                login.reset()
              }}
              disabled={login.isPending}
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Senha</label>
            <div className="login-password">
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  login.reset()
                }}
                disabled={login.isPending}
                required
              />
              {/* Alterna a visibilidade da senha, com estado anunciado por aria-pressed. */}
              <button
                type="button"
                className="login-password-toggle"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPassword}
                title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? (
                  <EyeOff size={20} aria-hidden="true" />
                ) : (
                  <Eye size={20} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <button type="submit" className="login-submit" disabled={login.isPending}>
            {login.isPending ? 'Entrando…' : 'Entrar'}
          </button>

          {login.isError && (
            <p className="login-message" role="alert">
              {errorMessage(login.error)}
            </p>
          )}
        </form>

        <p className="login-help">
          Precisa de acesso ou esqueceu sua senha? Entre em contato com o administrador do
          escritório.
        </p>
      </section>
    </main>
  )
}

export default Login
