import { InvalidPeriodError } from './catalog.errors.js'

const PERIOD_FORMAT = /^\d{4}-(0[1-9]|1[0-2])$/

export class Period {
  private constructor(readonly value: string) {}

  static create(raw: string): Period {
    const trimmed = raw.trim()
    if (!PERIOD_FORMAT.test(trimmed)) throw new InvalidPeriodError()
    return new Period(trimmed)
  }
}
