// Porta da aplicação: hash e comparação de senhas, implementada com bcrypt na infra (RNF04).
export interface PasswordHasher {
  hash(plain: string): Promise<string>
  compare(plain: string, hash: string): Promise<boolean>
}
