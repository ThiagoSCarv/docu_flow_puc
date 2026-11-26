// Base compartilhada: todos os enums do back-end; schema, validação e testes derivam daqui.

// Perfis de acesso (RF05).
export enum UserRole {
  ADMIN = 'ADMIN',
  FUNCIONARIO = 'FUNCIONARIO',
  CONSULTA = 'CONSULTA',
}

// Situação de um registro de backup (RF23, RF25).
export enum BackupStatus {
  REALIZADO = 'REALIZADO',
  VERIFICADO = 'VERIFICADO',
  FALHOU = 'FALHOU',
}

// Ações registradas no log de atividades; ação nova entra como membro aqui (RF26).
export enum ActivityAction {
  LOGIN_SUCESSO = 'LOGIN_SUCESSO',
  LOGIN_FALHA = 'LOGIN_FALHA',
  LOGIN_BLOQUEADO = 'LOGIN_BLOQUEADO',
  USUARIO_CRIADO = 'USUARIO_CRIADO',
  USUARIO_INATIVADO = 'USUARIO_INATIVADO',
  USUARIO_REATIVADO = 'USUARIO_REATIVADO',
  PERMISSAO_ALTERADA = 'PERMISSAO_ALTERADA',
  SENHA_REDEFINIDA = 'SENHA_REDEFINIDA',
  CLIENTE_CRIADO = 'CLIENTE_CRIADO',
  CLIENTE_ALTERADO = 'CLIENTE_ALTERADO',
  CLIENTE_INATIVADO = 'CLIENTE_INATIVADO',
  CLIENTE_REATIVADO = 'CLIENTE_REATIVADO',
  BACKUP_REGISTRADO = 'BACKUP_REGISTRADO',
  DOCUMENTO_CRIADO = 'DOCUMENTO_CRIADO',
}

// Tipo de registro afetado por uma ação do log, com o nome da tabela correspondente.
export enum ActivityEntity {
  USERS = 'users',
  DOCUMENTS = 'documents',
  BACKUPS = 'backups',
  CLIENTS = 'clients',
}
