import { CategoryNotFoundError } from '../../domain/catalog/catalog.errors.js'
import type { CategoryRepository } from '../../domain/catalog/category.repository.js'
import { ROLES_THAT_VIEW_ALL_CATEGORIES } from '../../domain/catalog/category-access.policy.js'
import type { UserRepository } from '../../domain/identity/user.repository.js'
import { mapPage, type Page, type PageRequest } from '../../shared/utils/pagination.js'
import { toUserDto, type UserDto } from './user.dto.js'

export type ListCategoryAccessInput = {
  categoryId: string
  page: PageRequest
}

export class ListCategoryAccessUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly categories: CategoryRepository,
  ) {}

  async execute({ categoryId, page }: ListCategoryAccessInput): Promise<Page<UserDto>> {
    if (!(await this.categories.findById(categoryId))) throw new CategoryNotFoundError()
    const withAccess = await this.users.listWithCategoryAccess(
      { categoryId, rolesThatViewAll: ROLES_THAT_VIEW_ALL_CATEGORIES },
      page,
    )
    return mapPage(withAccess, toUserDto)
  }
}
