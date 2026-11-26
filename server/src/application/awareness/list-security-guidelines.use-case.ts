// Camada de aplicação: caso de uso das orientações educativas de segurança (RF28).
import {
  SECURITY_GUIDELINES,
  type SecurityGuideline,
} from '../../domain/awareness/security-guidelines.js'

// Devolve o conteúdo fixo do domínio; não usa banco porque as orientações são estáticas.
export class ListSecurityGuidelinesUseCase {
  execute(): readonly SecurityGuideline[] {
    return SECURITY_GUIDELINES
  }
}
