// Domínio (catalog): value object do nome padronizado CLIENTE_CATEGORIA_AAAA-MM_descricao (RF31).
import { InvalidDocumentNameError } from './catalog.errors.js'
import type { Period } from './period.value-object.js'

// Separadores e padrões que tiram acentos e símbolos, o que também impede `../` (path traversal).
const PART_SEPARATOR = '_'
const WORD_SEPARATOR = '-'
const DIACRITICS = /\p{M}/gu
const NON_ALPHANUMERIC_RUNS = /[^a-zA-Z0-9]+/g
const EDGE_SEPARATORS = /^-+|-+$/g

// Partes brutas que compõem o nome antes da padronização.
export type DocumentNameParts = {
  clientCode: string
  categoryCode: string
  period: Period
  description: string
}

// Nome imutável, gerado pelo sistema para que todos os documentos sigam o mesmo padrão.
export class DocumentName {
  private constructor(readonly value: string) {}

  // Monta o nome: cliente e categoria em maiúsculas, descrição em minúsculas, partes unidas por _.
  static create(parts: DocumentNameParts): DocumentName {
    const client = standardize(parts.clientCode, 'cliente').toUpperCase()
    const category = standardize(parts.categoryCode, 'categoria').toUpperCase()
    const description = standardize(parts.description, 'descrição').toLowerCase()

    return new DocumentName(
      [client, category, parts.period.value, description].join(PART_SEPARATOR),
    )
  }

  // Reconstrói o nome já padronizado vindo do banco, sem refazer a padronização.
  static restore(value: string): DocumentName {
    return new DocumentName(value)
  }
}

// Remove acentos, troca sequências não alfanuméricas por hífen e recusa parte que ficar vazia.
function standardize(raw: string, partLabel: string): string {
  const standardized = raw
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(NON_ALPHANUMERIC_RUNS, WORD_SEPARATOR)
    .replace(EDGE_SEPARATORS, '')
  if (!standardized) throw new InvalidDocumentNameError(partLabel)
  return standardized
}
