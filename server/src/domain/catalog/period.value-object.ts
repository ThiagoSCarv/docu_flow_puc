// Domínio (catalog): value object do período de competência do documento, AAAA-MM (RF14).
import { InvalidPeriodError } from './catalog.errors.js'

// Ano com 4 dígitos e mês de 01 a 12.
const PERIOD_FORMAT = /^\d{4}-(0[1-9]|1[0-2])$/

// Período imutável, sempre válido depois de criado.
export class Period {
  private constructor(readonly value: string) {}

  // Valida o texto recebido e recusa formato ou mês inválido.
  static create(raw: string): Period {
    const trimmed = raw.trim()
    if (!PERIOD_FORMAT.test(trimmed)) throw new InvalidPeriodError()
    return new Period(trimmed)
  }
}
