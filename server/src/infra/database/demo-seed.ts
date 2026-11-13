import { inArray } from 'drizzle-orm'
import type { UserDto } from '../../application/identity/user.dto.js'
import type { CatalogActor } from '../../domain/catalog/category-access.policy.js'
import { BackupStatus, UserRole } from '../../shared/utils/enums.js'
import { createUseCases } from '../http/composition-root.js'
import { categories, clients } from './schema.js'
import type { Database } from './types.js'

const SEED_ACTOR_IP = '127.0.0.1'
const DEMO_CLOUD_BASE_URL = 'https://nuvem.exemplo.com/escritorio'

type DocumentAuthorRole = UserRole.ADMIN | UserRole.FUNCIONARIO

export const DEMO_USERS = [
  {
    name: 'Funcionário Exemplo',
    email: 'funcionario@exemplo.com',
    role: UserRole.FUNCIONARIO,
    categoryCodes: ['CONT', 'FIS', 'FIN'],
  },
  {
    name: 'Consulta Exemplo',
    email: 'consulta@exemplo.com',
    role: UserRole.CONSULTA,
    categoryCodes: ['CONT', 'FIS'],
  },
]

export const DEMO_CLIENTS = [
  { name: 'Empresa Exemplo A Ltda', code: 'EMPRESA-A' },
  { name: 'Empresa Exemplo B S.A.', code: 'EMPRESA-B' },
  { name: 'Comércio Exemplo C', code: 'COMERCIO-C' },
  { name: 'Cliente D (MEI)', code: 'CLIENTE-D' },
]

export const DEMO_DOCUMENTS: {
  clientCode: string
  categoryCode: string
  period: string
  description: string
  author: DocumentAuthorRole
}[] = [
  {
    clientCode: 'EMPRESA-A',
    categoryCode: 'CONT',
    period: '2026-03',
    description: 'Balanço patrimonial',
    author: UserRole.ADMIN,
  },
  {
    clientCode: 'EMPRESA-A',
    categoryCode: 'CONT',
    period: '2026-09',
    description: 'Balancete mensal',
    author: UserRole.FUNCIONARIO,
  },
  {
    clientCode: 'EMPRESA-A',
    categoryCode: 'FIS',
    period: '2026-09',
    description: 'Apuração do Simples Nacional',
    author: UserRole.FUNCIONARIO,
  },
  {
    clientCode: 'EMPRESA-A',
    categoryCode: 'CTR',
    period: '2026-01',
    description: 'Contrato de prestação de serviços contábeis',
    author: UserRole.ADMIN,
  },
  {
    clientCode: 'EMPRESA-B',
    categoryCode: 'FIS',
    period: '2026-08',
    description: 'Guia de ICMS',
    author: UserRole.FUNCIONARIO,
  },
  {
    clientCode: 'EMPRESA-B',
    categoryCode: 'FIS',
    period: '2026-09',
    description: 'Guia de ICMS',
    author: UserRole.FUNCIONARIO,
  },
  {
    clientCode: 'EMPRESA-B',
    categoryCode: 'FIN',
    period: '2026-09',
    description: 'Extrato bancário',
    author: UserRole.FUNCIONARIO,
  },
  {
    clientCode: 'EMPRESA-B',
    categoryCode: 'ADM',
    period: '2026-06',
    description: 'Alteração contratual',
    author: UserRole.ADMIN,
  },
  {
    clientCode: 'COMERCIO-C',
    categoryCode: 'CONT',
    period: '2026-06',
    description: 'DRE semestral',
    author: UserRole.ADMIN,
  },
  {
    clientCode: 'COMERCIO-C',
    categoryCode: 'FIS',
    period: '2026-10',
    description: 'Notas fiscais de entrada',
    author: UserRole.FUNCIONARIO,
  },
  {
    clientCode: 'COMERCIO-C',
    categoryCode: 'FIN',
    period: '2026-10',
    description: 'Contas a pagar',
    author: UserRole.FUNCIONARIO,
  },
  {
    clientCode: 'CLIENTE-D',
    categoryCode: 'FIS',
    period: '2026-05',
    description: 'Declaração anual do MEI',
    author: UserRole.FUNCIONARIO,
  },
  {
    clientCode: 'CLIENTE-D',
    categoryCode: 'OUT',
    period: '2026-02',
    description: 'Comprovante de endereço',
    author: UserRole.ADMIN,
  },
]

export const DEMO_BACKUPS = [
  {
    performedAt: '2026-08-31T22:00:00-03:00',
    status: BackupStatus.VERIFICADO,
    scope: 'Pasta de clientes na nuvem',
    notes: 'Restauração de teste conferida',
  },
  {
    performedAt: '2026-09-30T22:00:00-03:00',
    status: BackupStatus.VERIFICADO,
    scope: 'Pasta de clientes na nuvem',
  },
  {
    performedAt: '2026-10-15T22:00:00-03:00',
    status: BackupStatus.FALHOU,
    scope: 'Pasta de clientes na nuvem',
    notes: 'Sincronização interrompida; repetir',
  },
  {
    performedAt: '2026-10-31T22:00:00-03:00',
    status: BackupStatus.REALIZADO,
    scope: 'Pasta de clientes na nuvem',
    notes: 'Aguardando verificação',
  },
]

export type DemoSeedInput = {
  admin: { id: string; name: string }
  password: string
}

export async function seedDemoData(db: Database, input: DemoSeedInput) {
  if (await demoDataExists(db)) return false
  await db.transaction((tx) => insertDemoData(tx, input))
  return true
}

async function insertDemoData(db: Database, { admin, password }: DemoSeedInput) {
  const useCases = createUseCases(db)
  const categoryIdByCode = await loadCategoryIds(db)
  const adminActor = { userId: admin.id, ip: SEED_ACTOR_IP }

  const demoUsers: UserDto[] = []
  for (const user of DEMO_USERS) {
    demoUsers.push(
      await useCases.createUser.execute({
        name: user.name,
        email: user.email,
        password,
        role: user.role,
        categoryIds: user.categoryCodes.map((code) => requireId(categoryIdByCode, code)),
        actor: adminActor,
      }),
    )
  }

  const clientIdByCode = new Map<string, string>()
  for (const client of DEMO_CLIENTS) {
    const created = await useCases.createClient.execute({ ...client, actor: adminActor })
    clientIdByCode.set(created.code, created.id)
  }

  const authors = documentAuthors(admin.id, demoUsers)
  for (const { clientCode, categoryCode, author, ...document } of DEMO_DOCUMENTS) {
    await useCases.createDocument.execute({
      ...document,
      clientId: requireId(clientIdByCode, clientCode),
      categoryId: requireId(categoryIdByCode, categoryCode),
      cloudLocation: `${DEMO_CLOUD_BASE_URL}/${clientCode}/${categoryCode}/${document.period}`,
      actor: authors[author],
    })
  }

  for (const { performedAt, ...backup } of DEMO_BACKUPS) {
    await useCases.registerBackup.execute({
      ...backup,
      performedAt: new Date(performedAt),
      actor: { ...adminActor, name: admin.name },
    })
  }
}

function requireId(idByCode: Map<string, string>, code: string) {
  const id = idByCode.get(code)
  if (!id) throw new Error(`Código ${code} não encontrado; rode a seed de categorias antes.`)
  return id
}

async function demoDataExists(db: Database) {
  const existing = await db
    .select({ id: clients.id })
    .from(clients)
    .where(
      inArray(
        clients.code,
        DEMO_CLIENTS.map((client) => client.code),
      ),
    )
    .limit(1)
  return existing.length > 0
}

async function loadCategoryIds(db: Database) {
  const rows = await db.select({ id: categories.id, code: categories.code }).from(categories)
  return new Map(rows.map((row) => [row.code, row.id]))
}

function documentAuthors(
  adminId: string,
  demoUsers: UserDto[],
): Record<DocumentAuthorRole, CatalogActor & { userId: string; ip: string }> {
  const employee = demoUsers.find((user) => user.role === UserRole.FUNCIONARIO)
  if (!employee) throw new Error('A seed de demonstração precisa de um FUNCIONARIO.')
  return {
    [UserRole.ADMIN]: {
      userId: adminId,
      role: UserRole.ADMIN,
      allowedCategoryIds: [],
      ip: SEED_ACTOR_IP,
    },
    [UserRole.FUNCIONARIO]: {
      userId: employee.id,
      role: employee.role,
      allowedCategoryIds: employee.allowedCategoryIds,
      ip: SEED_ACTOR_IP,
    },
  }
}
