// Camada de aplicação: listagem de usuários para a gestão do administrador (RF01, RF05).
import type { UserRepository } from '../../domain/identity/user.repository.js'
import { mapPage, type Page, type PageRequest } from '../../shared/utils/pagination.js'
import { toUserDto, type UserDto } from './user.dto.js'

// Lista usuários paginados, sempre como DTO para nunca expor o hash da senha (RNF10).
export class ListUsersUseCase {
  constructor(private readonly users: UserRepository) {}

  // Busca uma página e converte cada usuário em DTO.
  async execute(page: PageRequest): Promise<Page<UserDto>> {
    return mapPage(await this.users.list(page), toUserDto)
  }
}
