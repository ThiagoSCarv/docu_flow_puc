export interface CategoryRepository {
  findExistingIds(ids: string[]): Promise<string[]>
}
