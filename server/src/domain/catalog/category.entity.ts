// Domínio (catalog): categoria de documento, cadastrada pela seed e somente lida pela aplicação.

// Categoria imutável; o código curto compõe o nome padronizado (RF11, RF31).
export type Category = {
  readonly id: string
  readonly name: string
  readonly code: string
}
