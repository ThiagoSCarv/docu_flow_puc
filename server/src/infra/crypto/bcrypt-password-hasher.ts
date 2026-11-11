import bcrypt from 'bcryptjs'
import type { PasswordHasher } from '../../application/ports/password-hasher.js'

export const BCRYPT_ROUNDS = 10

export class BcryptPasswordHasher implements PasswordHasher {
  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_ROUNDS)
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash)
  }
}
