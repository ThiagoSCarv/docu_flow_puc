import { NotAuthenticatedError } from '../../domain/identity/identity.errors.js'
import type { UserRepository } from '../../domain/identity/user.repository.js'
import { toUserDto, type UserDto } from './user.dto.js'

export class GetAuthenticatedUserUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string): Promise<UserDto> {
    const user = await this.users.findById(userId)
    if (!user?.active) throw new NotAuthenticatedError()
    return toUserDto(user)
  }
}
