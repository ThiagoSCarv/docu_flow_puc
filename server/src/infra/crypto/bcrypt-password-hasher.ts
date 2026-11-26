// Infra: hash de senhas com bcrypt, implementação da porta PasswordHasher (RNF04).
import bcrypt from 'bcryptjs'
import type { PasswordHasher } from '../../application/ports/password-hasher.js'

// Custo do bcrypt: equilíbrio entre resistência a força bruta e tempo de resposta do login.
export const BCRYPT_ROUNDS = 10

// Senhas nunca são guardadas em texto puro; só o hash vai para o banco.
export class BcryptPasswordHasher implements PasswordHasher {
  // Gera o hash com sal aleatório embutido.
  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_ROUNDS)
  }

  // Confere a senha digitada contra o hash salvo, em tempo constante.
  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash)
  }
}
