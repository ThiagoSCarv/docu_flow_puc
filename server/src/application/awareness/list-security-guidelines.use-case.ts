import {
  SECURITY_GUIDELINES,
  type SecurityGuideline,
} from '../../domain/awareness/security-guidelines.js'

export class ListSecurityGuidelinesUseCase {
  execute(): readonly SecurityGuideline[] {
    return SECURITY_GUIDELINES
  }
}
