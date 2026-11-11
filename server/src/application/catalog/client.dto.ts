import type { Client } from '../../domain/catalog/client.entity.js'

export type ClientDto = {
  id: string
  name: string
  code: string
  active: boolean
}

export function toClientDto(client: Client): ClientDto {
  return { id: client.id, name: client.name, code: client.code, active: client.active }
}
