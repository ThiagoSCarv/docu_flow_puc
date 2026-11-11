export enum UserRole {
  ADMIN = 'ADMIN',
  FUNCIONARIO = 'FUNCIONARIO',
  CONSULTA = 'CONSULTA',
}

export enum BackupStatus {
  REALIZADO = 'REALIZADO',
  VERIFICADO = 'VERIFICADO',
  FALHOU = 'FALHOU',
}

export enum ActivityAction {
  LOGIN_SUCESSO = 'LOGIN_SUCESSO',
  LOGIN_FALHA = 'LOGIN_FALHA',
  LOGIN_BLOQUEADO = 'LOGIN_BLOQUEADO',
  USUARIO_CRIADO = 'USUARIO_CRIADO',
  DOCUMENTO_CRIADO = 'DOCUMENTO_CRIADO',
}

export enum ActivityEntity {
  USERS = 'users',
  DOCUMENTS = 'documents',
  BACKUPS = 'backups',
  CLIENTS = 'clients',
}
