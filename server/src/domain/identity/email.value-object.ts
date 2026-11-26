// Domínio (identity): value object do e-mail usado no login (RF02).
import { InvalidEmailError } from './identity.errors.js'

// Validação simples de formato: algo@dominio.tld, sem espaços.
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// E-mail imutável e sempre em minúsculas, para o login não depender de maiúsculas.
export class Email {
  private constructor(readonly value: string) {}

  // Normaliza para minúsculas e recusa formato inválido.
  static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase()
    if (!EMAIL_FORMAT.test(normalized)) throw new InvalidEmailError()
    return new Email(normalized)
  }

  // Compara pelo valor normalizado, como todo value object.
  equals(other: Email): boolean {
    return this.value === other.value
  }
}
