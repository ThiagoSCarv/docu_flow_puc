import type { UserRepository } from '../../domain/identity/user.repository.js'
import { mapPage, type Page, type PageRequest } from '../../shared/utils/pagination.js'
import { toUserDto, type UserDto } from './user.dto.js'

export class ListUsersUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(page: PageRequest): Promise<Page<UserDto>> {
    return mapPage(await this.users.list(page), toUserDto)
  }
}
