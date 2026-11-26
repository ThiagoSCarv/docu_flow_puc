// Domínio (catalog): entidade do cliente fictício do escritório (RF06, RF07, RF10).
import { InvalidClientCodeError } from './catalog.errors.js'

// Regras do código do cliente: curto e só com caracteres seguros para o nome padronizado.
export const CLIENT_CODE_MAX_LENGTH = 20
const CLIENT_CODE_PATTERN = /^[A-Z0-9-]+$/

// Estado completo do cliente, como persistido.
export type ClientProps = {
  id: string
  name: string
  code: string
  active: boolean
  createdAt: Date
}

// Dados de cadastro: só nome e código; id, situação e data são definidos pela entidade.
export type NewClientProps = Pick<ClientProps, 'name' | 'code'>

// Cliente com identidade própria; o código é fixo e só nome e situação mudam.
export class Client {
  private constructor(private readonly props: ClientProps) {}

  // Cadastra um cliente novo, já ativo, com código normalizado e validado.
  static create(input: NewClientProps, now: Date): Client {
    return new Client({
      id: crypto.randomUUID(),
      name: input.name.trim(),
      code: Client.normalizeCode(input.code),
      active: true,
      createdAt: now,
    })
  }

  // Reconstrói a entidade vinda do banco, sem revalidar.
  static restore(props: ClientProps): Client {
    return new Client({ ...props })
  }

  // Põe o código em maiúsculas e recusa tamanho ou caracteres fora do padrão.
  private static normalizeCode(code: string): string {
    const normalized = code.trim().toUpperCase()
    const isValid =
      normalized.length <= CLIENT_CODE_MAX_LENGTH && CLIENT_CODE_PATTERN.test(normalized)
    if (!isValid) throw new InvalidClientCodeError(CLIENT_CODE_MAX_LENGTH)
    return normalized
  }

  // Acessores somente leitura do estado do cliente.
  get id() {
    return this.props.id
  }

  get name() {
    return this.props.name
  }

  get code() {
    return this.props.code
  }

  get active() {
    return this.props.active
  }

  get createdAt() {
    return this.props.createdAt
  }

  // Troca só o nome; o código continua, pois já compõe nomes de documentos (RF07).
  rename(name: string): void {
    this.props.name = name.trim()
  }

  // Reativa o cliente para voltar a receber documentos novos (RF10).
  activate(): void {
    this.props.active = true
  }

  // Inativa sem apagar nem esconder os documentos já cadastrados (RF10).
  deactivate(): void {
    this.props.active = false
  }
}
