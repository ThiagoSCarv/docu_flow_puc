import { describe, expect, it } from 'vitest'
import { ListSecurityGuidelinesUseCase } from '../../../src/application/awareness/list-security-guidelines.use-case.js'

const guidelines = new ListSecurityGuidelinesUseCase().execute()

describe('ListSecurityGuidelinesUseCase', () => {
  it('devolve as orientações com identificadores únicos em kebab-case', () => {
    const ids = guidelines.map((guideline) => guideline.id)
    expect(ids.length).toBeGreaterThanOrEqual(6)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/)
  })

  it('toda orientação tem título, resumo e pelo menos duas práticas preenchidas', () => {
    for (const guideline of guidelines) {
      expect(guideline.title.trim()).not.toBe('')
      expect(guideline.summary.trim()).not.toBe('')
      expect(guideline.practices.length).toBeGreaterThanOrEqual(2)
      for (const practice of guideline.practices) expect(practice.trim()).not.toBe('')
    }
  })

  it('cobre golpes, senhas gov.br, links da nuvem e backups do diagnóstico', () => {
    expect(guidelines.map((guideline) => guideline.id)).toEqual(
      expect.arrayContaining([
        'golpes-por-mensagem',
        'senhas-e-gov-br',
        'links-na-nuvem',
        'backups',
      ]),
    )
  })

  it('o conteúdo não pode ser alterado em tempo de execução', () => {
    expect(Object.isFrozen(guidelines)).toBe(true)
    expect(Object.isFrozen(guidelines[0])).toBe(true)
    expect(Object.isFrozen(guidelines[0].practices)).toBe(true)
  })
})
