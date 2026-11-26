// Infra: relógio real do sistema, implementação da porta Clock usada pelos casos de uso.
import type { Clock } from '../../application/ports/clock.js'

// Devolve a hora atual; nos testes é trocado por um relógio fixo para controlar o tempo.
export class SystemClock implements Clock {
  now(): Date {
    return new Date()
  }
}
