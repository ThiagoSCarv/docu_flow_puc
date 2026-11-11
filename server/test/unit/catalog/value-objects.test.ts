import { describe, expect, it } from 'vitest'
import {
  InvalidDocumentNameError,
  InvalidPeriodError,
} from '../../../src/domain/catalog/catalog.errors.js'
import { DocumentName } from '../../../src/domain/catalog/document-name.value-object.js'
import { Period } from '../../../src/domain/catalog/period.value-object.js'

describe('Period', () => {
  it.each(['2026-01', '2026-12', '1999-07'])('aceita "%s"', (raw) => {
    expect(Period.create(raw).value).toBe(raw)
  })

  it('remove espaços nas pontas', () => {
    expect(Period.create(' 2026-03 ').value).toBe('2026-03')
  })

  it.each(['', '2026-13', '2026-00', '2026-1', '26-01', '2026/01', '2026-01-15'])(
    'rejeita "%s"',
    (raw) => {
      expect(() => Period.create(raw)).toThrow(InvalidPeriodError)
    },
  )
})

describe('DocumentName', () => {
  const period = Period.create('2026-03')

  it('monta o nome no formato CLIENTE_CATEGORIA_AAAA-MM_descricao', () => {
    const name = DocumentName.create({
      clientCode: 'CLIA',
      categoryCode: 'FIS',
      period,
      description: 'nota fiscal',
    })

    expect(name.value).toBe('CLIA_FIS_2026-03_nota-fiscal')
  })

  it('remove acentos e caracteres especiais', () => {
    const name = DocumentName.create({
      clientCode: 'Empresa Exemplo',
      categoryCode: 'cont',
      period,
      description: 'Balanço Patrimonial (versão final)!',
    })

    expect(name.value).toBe('EMPRESA-EXEMPLO_CONT_2026-03_balanco-patrimonial-versao-final')
  })

  it('impede path traversal na descrição', () => {
    const name = DocumentName.create({
      clientCode: 'CLIA',
      categoryCode: 'FIS',
      period,
      description: '../../etc/passwd',
    })

    expect(name.value).toBe('CLIA_FIS_2026-03_etc-passwd')
  })

  it.each([
    ['cliente', { clientCode: '***', categoryCode: 'FIS', description: 'nota' }],
    ['categoria', { clientCode: 'CLIA', categoryCode: ' ', description: 'nota' }],
    ['descrição', { clientCode: 'CLIA', categoryCode: 'FIS', description: '../' }],
  ])('rejeita %s vazio após a padronização', (_, parts) => {
    expect(() => DocumentName.create({ ...parts, period })).toThrow(InvalidDocumentNameError)
  })
})
