import type { UserRepository } from '../../domain/identity/user.repository.js'
import { toUserDto, type UserDto } from './user.dto.js'

export class ListUsersUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(): Promise<UserDto[]> {
    const users = await this.users.findAll()
    return users.map(toUserDto)
  }
}
