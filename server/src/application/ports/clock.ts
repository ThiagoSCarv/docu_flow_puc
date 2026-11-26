// Porta da aplicação: fonte da hora atual, trocável nos testes por um relógio fixo.
export interface Clock {
  now(): Date
}
