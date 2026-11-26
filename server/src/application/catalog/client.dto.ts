// Camada de aplicação: DTO de saída dos clientes fictícios (RF06, RF08).
import type { Client } from '../../domain/catalog/client.entity.js'

// Campos do cliente que a camada HTTP pode mostrar.
export type ClientDto = {
  id: string
  name: string
  code: string
  active: boolean
}

// Converte a entidade em DTO, sem campos de controle internos.
export function toClientDto(client: Client): ClientDto {
  return { id: client.id, name: client.name, code: client.code, active: client.active }
}
