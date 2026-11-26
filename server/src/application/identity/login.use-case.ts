// Camada de aplicação: login por e-mail e senha com bloqueio por força bruta (RF02, RNF13).
import type { ActivityLogRepository } from '../../domain/audit/activity-log.repository.js'
import { Email } from '../../domain/identity/email.value-object.js'
import {
  AccountLockedError,
  InvalidCredentialsError,
} from '../../domain/identity/identity.errors.js'
import type { User } from '../../domain/identity/user.entity.js'
import type { UserRepository } from '../../domain/identity/user.repository.js'
import { ActivityAction } from '../../shared/utils/enums.js'
import type { Clock } from '../ports/clock.js'
import type { PasswordHasher } from '../ports/password-hasher.js'

// Senha descartável comparada quando o e-mail não existe, para igualar o tempo de resposta.
const PASSWORD_FOR_CONSTANT_TIME = 'senha-ficticia-para-tempo-constante'

// Credenciais informadas e o IP de origem, gravado no log.
export type LoginInput = { email: string; password: string; ip: string }
// Só o id do usuário; a rota é quem assina o JWT, detalhe de transporte.
export type LoginOutput = { userId: string }

// Autentica o usuário sem revelar se o e-mail existe e registra cada tentativa (RF26).
export class LoginUseCase {
  private readonly dummyHash: Promise<string>

  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly activityLog: ActivityLogRepository,
    private readonly clock: Clock,
  ) {
    this.dummyHash = hasher.hash(PASSWORD_FOR_CONSTANT_TIME)
  }

  // Compara a senha sempre, antes das checagens, para não vazar pelo tempo se a conta existe.
  async execute({ email, password, ip }: LoginInput): Promise<LoginOutput> {
    const user = await this.users.findByEmail(Email.create(email))
    const passwordMatches = await this.hasher.compare(
      password,
      user?.passwordHash ?? (await this.dummyHash),
    )

    if (!user) return this.reject(null, ActivityAction.LOGIN_FALHA, ip)

    const now = this.clock.now()
    if (user.isLockedAt(now)) return this.reject(user.id, ActivityAction.LOGIN_BLOQUEADO, ip)
    if (!user.active) return this.reject(user.id, ActivityAction.LOGIN_FALHA, ip)
    if (!passwordMatches) return this.handleWrongPassword(user, now, ip)

    user.registerSuccessfulLogin()
    await this.users.save(user)
    await this.activityLog.record({ userId: user.id, action: ActivityAction.LOGIN_SUCESSO, ip })
    return { userId: user.id }
  }

  // Conta a falha e, se atingiu o limite de tentativas, registra como bloqueio (RNF13).
  private async handleWrongPassword(user: User, now: Date, ip: string): Promise<never> {
    user.registerFailedLogin(now)
    await this.users.save(user)
    const action = user.isLockedAt(now)
      ? ActivityAction.LOGIN_BLOQUEADO
      : ActivityAction.LOGIN_FALHA
    return this.reject(user.id, action, ip)
  }

  // Registra a tentativa recusada no log e lança erro de conta bloqueada ou credencial inválida.
  private async reject(userId: string | null, action: ActivityAction, ip: string): Promise<never> {
    await this.activityLog.record({ userId, action, ip })
    throw action === ActivityAction.LOGIN_BLOQUEADO
      ? new AccountLockedError()
      : new InvalidCredentialsError()
  }
}
