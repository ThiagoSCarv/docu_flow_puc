export type PageRequest = {
  limit: number
  offset: number
}

export type Page<T> = {
  items: T[]
  total: number
}

export function emptyPage<T>(): Page<T> {
  return { items: [], total: 0 }
}

export function mapPage<T, R>(page: Page<T>, map: (item: T) => R): Page<R> {
  return { items: page.items.map(map), total: page.total }
}
