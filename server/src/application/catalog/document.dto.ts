import type { Document } from '../../domain/catalog/document.entity.js'

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
