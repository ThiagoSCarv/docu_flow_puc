// Domínio (identity): entidade do usuário, com perfil, categorias permitidas e bloqueio de login.
import type { UserRole } from '../../shared/utils/enums.js'
import type { Email } from './email.value-object.js'

// 5 falhas seguidas bloqueiam a conta por 15 minutos, contra força bruta (RNF13).
export const MAX_FAILED_LOGIN_ATTEMPTS = 5
export const LOCK_DURATION_MINUTES = 15

const LOCK_DURATION_MS = LOCK_DURATION_MINUTES * 60 * 1000

// Estado completo do usuário; a senha existe só como hash bcrypt (RNF04).
export type UserProps = {
  id: string
  name: string
  email: Email
  passwordHash: string
  role: UserRole
  active: boolean
  failedLoginAttempts: number
  lockedUntil: Date | null
  createdAt: Date
  allowedCategoryIds: string[]
}

// Dados do cadastro feito pelo ADMIN, já com perfil e categorias permitidas (RF01, RF05).
export type NewUserProps = Pick<UserProps, 'name' | 'email' | 'passwordHash' | 'role'> & {
  allowedCategoryIds: string[]
}

// Usuário do escritório; as regras de login, bloqueio e permissão moram aqui.
export class User {
  private constructor(private readonly props: UserProps) {}

  // Cria um usuário ativo, sem falhas de login e com categorias permitidas sem repetição.
  static create(input: NewUserProps, now: Date): User {
    return new User({
      ...input,
      id: crypto.randomUUID(),
      active: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: now,
      allowedCategoryIds: [...new Set(input.allowedCategoryIds)],
    })
  }

  // Reconstrói a entidade vinda do banco, sem revalidar.
  static restore(props: UserProps): User {
    return new User({ ...props })
  }

  // Acessores somente leitura; passwordHash nunca sai nas respostas da API (RNF10).
  get id() {
    return this.props.id
  }

  get name() {
    return this.props.name
  }

  get email() {
    return this.props.email
  }

  get passwordHash() {
    return this.props.passwordHash
  }

  get role() {
    return this.props.role
  }

  get active() {
    return this.props.active
  }

  get failedLoginAttempts() {
    return this.props.failedLoginAttempts
  }

  get lockedUntil() {
    return this.props.lockedUntil
  }

  get createdAt() {
    return this.props.createdAt
  }

  get allowedCategoryIds(): readonly string[] {
    return this.props.allowedCategoryIds
  }

  // Diz se o bloqueio por tentativas ainda vale no instante informado (RNF13).
  isLockedAt(now: Date): boolean {
    return this.props.lockedUntil !== null && this.props.lockedUntil > now
  }

  // Conta a falha e, ao atingir o limite, bloqueia a conta e zera o contador (RNF13).
  registerFailedLogin(now: Date): void {
    this.props.failedLoginAttempts += 1
    if (this.props.failedLoginAttempts < MAX_FAILED_LOGIN_ATTEMPTS) return

    this.props.failedLoginAttempts = 0
    this.props.lockedUntil = new Date(now.getTime() + LOCK_DURATION_MS)
  }

  // Login correto zera as falhas acumuladas.
  registerSuccessfulLogin(): void {
    this.unlock()
  }

  // Redefinição pelo ADMIN (sem RF03): troca o hash e desbloqueia a conta.
  resetPassword(passwordHash: string): void {
    this.props.passwordHash = passwordHash
    this.unlock()
  }

  // Reativa o usuário, que volta a conseguir entrar (RF04).
  activate(): void {
    this.props.active = true
  }

  // Inativa sem apagar; o login passa a falhar e o token em uso para na próxima requisição (RF04).
  deactivate(): void {
    this.props.active = false
  }

  // Troca perfil e categorias permitidas, removendo ids repetidos (RF20).
  changePermissions(role: UserRole, allowedCategoryIds: string[]): void {
    this.props.role = role
    this.props.allowedCategoryIds = [...new Set(allowedCategoryIds)]
  }

  // Zera o contador de falhas e remove o bloqueio.
  private unlock(): void {
    this.props.failedLoginAttempts = 0
    this.props.lockedUntil = null
  }
}
