import { InvalidEmailError } from './identity.errors.js'

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export class Email {
  private constructor(readonly value: string) {}

  static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase()
    if (!EMAIL_FORMAT.test(normalized)) throw new InvalidEmailError()
    return new Email(normalized)
  }

  equals(other: Email): boolean {
    return this.value === other.value
  }
}
