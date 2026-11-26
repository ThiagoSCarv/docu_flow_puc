// Domínio (catalog): entidade do documento catalogado; guarda metadados, não o arquivo (RF11, RF17).
import type { DocumentName } from './document-name.value-object.js'
import type { Period } from './period.value-object.js'

// Estado completo do documento: nome padronizado, período, link na nuvem, cliente e categoria.
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

// Dados de cadastro; id e data de criação são definidos pela entidade.
export type NewDocumentProps = Omit<DocumentProps, 'id' | 'createdAt'>

// Documento sem alterações após o cadastro; as validações ficam nos value objects e no caso de uso.
export class Document {
  private constructor(private readonly props: DocumentProps) {}

  // Cadastra um documento novo com id gerado e data de criação recebida por parâmetro.
  static create(input: NewDocumentProps, now: Date): Document {
    return new Document({ ...input, id: crypto.randomUUID(), createdAt: now })
  }

  // Reconstrói a entidade vinda do banco, sem revalidar.
  static restore(props: DocumentProps): Document {
    return new Document({ ...props })
  }

  // Acessores somente leitura do estado do documento.
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
