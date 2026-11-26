// Camada de aplicação: carrega o usuário dono do token JWT em cada requisição (RF02, RNF05).
import { NotAuthenticatedError } from '../../domain/identity/identity.errors.js'
import type { UserRepository } from '../../domain/identity/user.repository.js'
import { toUserDto, type UserDto } from './user.dto.js'

// Confere no banco que o usuário do token ainda existe e está ativo.
export class GetAuthenticatedUserUseCase {
  constructor(private readonly users: UserRepository) {}

  // Usuário removido ou desativado invalida o token na hora, mesmo antes de expirar.
  async execute(userId: string): Promise<UserDto> {
    const user = await this.users.findById(userId)
    if (!user?.active) throw new NotAuthenticatedError()
    return toUserDto(user)
  }
}
