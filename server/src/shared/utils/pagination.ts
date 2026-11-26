// Base compartilhada: tipos e funções da paginação { items, total } das listagens.

// Pedido de página; padrão e teto do limit são definidos na camada HTTP.
export type PageRequest = {
  limit: number
  offset: number
}

// Página de resultados com o total geral do filtro, para o front montar a navegação.
export type Page<T> = {
  items: T[]
  total: number
}

// Página vazia, devolvida sem consultar o banco quando o escopo de categorias é vazio.
export function emptyPage<T>(): Page<T> {
  return { items: [], total: 0 }
}

// Converte os itens (ex.: entidade em DTO) mantendo o total.
export function mapPage<T, R>(page: Page<T>, map: (item: T) => R): Page<R> {
  return { items: page.items.map(map), total: page.total }
}
