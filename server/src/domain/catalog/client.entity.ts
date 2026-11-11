export type ClientProps = {
  id: string
  name: string
  code: string
  active: boolean
  createdAt: Date
}

export class Client {
  private constructor(private readonly props: ClientProps) {}

  static restore(props: ClientProps): Client {
    return new Client({ ...props })
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
