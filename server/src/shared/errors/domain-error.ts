// Base compartilhada: todo erro de negócio estende esta classe, e o error handler a traduz em HTTP.

// Erro com mensagem para o usuário final, que a API devolve como { message }.
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message)
    // Usa o nome da subclasse concreta, o que facilita logs e o mapeamento de status.
    this.name = new.target.name
  }
}
