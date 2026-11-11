import { InvalidDocumentNameError } from './catalog.errors.js'
import type { Period } from './period.value-object.js'

const PART_SEPARATOR = '_'
const WORD_SEPARATOR = '-'
const DIACRITICS = /\p{M}/gu
const NON_ALPHANUMERIC_RUNS = /[^a-zA-Z0-9]+/g
const EDGE_SEPARATORS = /^-+|-+$/g

export type DocumentNameParts = {
  clientCode: string
  categoryCode: string
  period: Period
  description: string
}

export class DocumentName {
  private constructor(readonly value: string) {}

  static create(parts: DocumentNameParts): DocumentName {
    const client = standardize(parts.clientCode, 'cliente').toUpperCase()
    const category = standardize(parts.categoryCode, 'categoria').toUpperCase()
    const description = standardize(parts.description, 'descrição').toLowerCase()

    return new DocumentName(
      [client, category, parts.period.value, description].join(PART_SEPARATOR),
    )
  }
}

function standardize(raw: string, partLabel: string): string {
  const standardized = raw
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(NON_ALPHANUMERIC_RUNS, WORD_SEPARATOR)
    .replace(EDGE_SEPARATORS, '')
  if (!standardized) throw new InvalidDocumentNameError(partLabel)
  return standardized
}
