import type { DocumentName } from './document-name.value-object.js'
import type { Period } from './period.value-object.js'

export type DocumentProps = {
  id: string
  name: DocumentName
  description: string
  period: Period
  cloudLocation: string
  clientId: string
  categoryId: string
  createdBy: string
  createdAt: Date
}

export type NewDocumentProps = Omit<DocumentProps, 'id' | 'createdAt'>

export class Document {
  private constructor(private readonly props: DocumentProps) {}

  static create(input: NewDocumentProps, now: Date): Document {
    return new Document({ ...input, id: crypto.randomUUID(), createdAt: now })
  }

  static restore(props: DocumentProps): Document {
    return new Document({ ...props })
  }

  get id() {
    return this.props.id
  }

  get name() {
    return this.props.name
  }

  get description() {
    return this.props.description
  }

  get period() {
    return this.props.period
  }

  get cloudLocation() {
    return this.props.cloudLocation
  }

  get clientId() {
    return this.props.clientId
  }

  get categoryId() {
    return this.props.categoryId
  }

  get createdBy() {
    return this.props.createdBy
  }

  get createdAt() {
    return this.props.createdAt
  }
}
