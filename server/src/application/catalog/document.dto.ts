// Camada de aplicação: DTO de saída dos documentos do catálogo (RF11, RF15).
import type { Document } from '../../domain/catalog/document.entity.js'

// Metadados do documento expostos à API, com value objects já convertidos em texto.
export type DocumentDto = {
  id: string
  name: string
  description: string
  period: string
  cloudLocation: string
  clientId: string
  categoryId: string
  createdBy: string
  createdAt: Date
}

// Converte a entidade em DTO, extraindo o valor de nome e período.
export function toDocumentDto(document: Document): DocumentDto {
  return {
    id: document.id,
    name: document.name.value,
    description: document.description,
    period: document.period.value,
    cloudLocation: document.cloudLocation,
    clientId: document.clientId,
    categoryId: document.categoryId,
    createdBy: document.createdBy,
    createdAt: document.createdAt,
  }
}
