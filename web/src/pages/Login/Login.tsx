import { FolderOpen } from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'
import './Login.css'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setMessage('Formulário validado. A conexão com o servidor será implementada na próxima etapa.')
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
                setMessage('')
              }}
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Senha</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setMessage('')
              }}
              required
            />
          </div>

          <button type="submit" className="login-submit">
            Entrar
          </button>

          {message && (
            <p className="login-message" role="status">
              {message}
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
