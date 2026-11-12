import { InvalidClientCodeError } from './catalog.errors.js'

export const CLIENT_CODE_MAX_LENGTH = 20
const CLIENT_CODE_PATTERN = /^[A-Z0-9-]+$/

export type ClientProps = {
  id: string
  name: string
  code: string
  active: boolean
  createdAt: Date
}

export type NewClientProps = Pick<ClientProps, 'name' | 'code'>

export class Client {
  private constructor(private readonly props: ClientProps) {}

  static create(input: NewClientProps, now: Date): Client {
    return new Client({
      id: crypto.randomUUID(),
      name: input.name.trim(),
      code: Client.normalizeCode(input.code),
      active: true,
      createdAt: now,
    })
  }

  static restore(props: ClientProps): Client {
    return new Client({ ...props })
  }

  private static normalizeCode(code: string): string {
    const normalized = code.trim().toUpperCase()
    const isValid =
      normalized.length <= CLIENT_CODE_MAX_LENGTH && CLIENT_CODE_PATTERN.test(normalized)
    if (!isValid) throw new InvalidClientCodeError(CLIENT_CODE_MAX_LENGTH)
    return normalized
  }

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
}
