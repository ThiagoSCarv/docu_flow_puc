# OrganizaDoc

Catálogo de documentos digitais para um escritório de contabilidade (Projeto Integrador III-A, PUC Goiás). Arquitetura cliente-servidor com comunicação protegida por HTTPS/TLS.

## Estrutura

Monorepo com **npm workspaces**:

| Pasta      | O que é                                        |
| ---------- | ---------------------------------------------- |
| `server/`  | API REST (Fastify 5, Drizzle, PostgreSQL, Zod) |
| `web/`     | Interface (React + Vite, TanStack Query)       |
| `scripts/` | Utilitários (geração de certificados)          |
| `certs/`   | Certificados locais (gerados, fora do git)     |

O back-end segue DDD e Clean Architecture. As dependências apontam para dentro: `infra` → `application` → `domain` → `shared`.

```
server/
├── src/
│   ├── shared/         # enums (utils/enums.ts) e erro base de domínio
│   ├── domain/         # entidades, value objects e repositórios por contexto (identity, catalog, backup, audit)
│   ├── application/    # casos de uso (um por arquivo) e portas (PasswordHasher, Clock)
│   └── infra/          # Fastify (http/), Drizzle (database/), bcrypt, env
├── drizzle/            # migrations geradas
└── test/
    ├── unit/           # domínio e casos de uso com fakes em memória
    └── integration/    # HTTP + PGlite
web/
├── src/
│   ├── main.tsx        # ponto de entrada (QueryClientProvider)
│   └── App.tsx         # tela provisória
└── vite.config.ts      # HTTPS + proxy de /api
```

## Pré-requisitos

- Node.js 22 ou superior (`.nvmrc`)
- Docker (para o PostgreSQL)

## Como rodar

```bash
npm install          # instala server e web de uma vez
npm run certs        # gera certs/key.pem e certs/cert.pem (uma vez só)
cp server/.env.example server/.env
```

O `server/.env` é obrigatório: o servidor não sobe sem `DATABASE_URL` e `JWT_SECRET` (mínimo 32 caracteres). O `DATABASE_URL` do `.env.example` já bate com o PostgreSQL do Docker; troque `JWT_SECRET` e `SEED_ADMIN_PASSWORD`. Para gerar um segredo: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. Ele é lido pelo próprio Node (`process.loadEnvFile`), sem dotenv.

Em dois terminais:

```bash
npm run dev:server   # API em https://localhost:3333 (docs em /docs)
npm run dev:web      # front em https://localhost:5173
```

O navegador vai avisar que o certificado é autoassinado. Aceite uma vez para `localhost:3333` e uma vez para `localhost:5173`.

Para conferir: abra https://localhost:5173. A tela deve mostrar `API: ok`.

### Banco de dados

```bash
npm run db:up                      # sobe o PostgreSQL no Docker
npm run db:migrate -w server       # cria/atualiza as tabelas
npm run db:seed -w server          # categorias iniciais + admin (SEED_ADMIN_* do .env)
npm run db:down                    # derruba
```

Ao alterar `server/src/infra/database/schema.ts`, gere a migration com `npm run db:generate -w server -- --name <descricao>` e faça commit da pasta `server/drizzle/` junto.

## Comunicação entre web e server

- **Prefixo `/api`:** todas as rotas da API começam com `/api` (ex.: `/api/health`, `/api/auth/login`). Assim elas não colidem com as rotas do React Router quando o Fastify passar a servir o build do front.
- **Caminhos relativos:** o front chama sempre `fetch('/api/...')`. Em desenvolvimento, o Vite repassa essas chamadas para `https://localhost:3333` (proxy). Em produção, front e API ficam na mesma origem. Nos dois casos não há CORS nem URL fixa no código. Para apontar para outra API em dev: `API_URL=https://outro-host npm run dev:web`.
- **Contrato:** a documentação OpenAPI em **https://localhost:3333/docs** é gerada automaticamente a partir dos schemas Zod das rotas. É a referência do front para formatos de requisição e resposta.
- **Autenticação:** `POST /api/auth/login` com `{ email, password }` devolve `{ token }`, válido por 1 hora. As demais rotas recebem o header `Authorization: Bearer <token>`. `GET /api/auth/me` devolve o usuário logado (nome, e-mail, perfil). Respostas: 401 para credenciais inválidas ou token ausente/expirado, 403 para perfil sem permissão, 423 para conta bloqueada após 5 tentativas (15 minutos), 429 para mais de 10 tentativas de login por minuto. No `/docs`, use o botão **Authorize** com o token para testar as rotas protegidas.
- **Health check:** `GET /api/health` retorna `{ "status": "ok" }` e serve para confirmar que o cliente alcança o servidor via HTTPS.

## Rotas da API

Todas sob `/api`. As permissões são verificadas no servidor. Perfis: `ADMIN`, `FUNCIONARIO` e `CONSULTA`.

| Método     | Rota                                           | Acesso                                          | Requisito                          |
| ---------- | ---------------------------------------------- | ----------------------------------------------- | ---------------------------------- |
| GET        | `/health`                                      | público                                         | —                                  |
| POST       | `/auth/login`                                  | público, 10 tentativas/min                      | RF02                               |
| GET        | `/auth/me`                                     | autenticado                                     | RF02                               |
| GET / POST | `/users`                                       | ADMIN                                           | RF01, RF05                         |
| GET        | `/categories`                                  | autenticado, só as categorias permitidas        | RF19                               |
| GET / POST | `/clients`                                     | autenticado / ADMIN                             | RF06, RF08                         |
| GET        | `/documents?search&categoryId&clientId&period` | autenticado, só as categorias permitidas        | RF15, RF19                         |
| POST       | `/documents`                                   | ADMIN; FUNCIONARIO só nas categorias permitidas | RF09, RF11, RF12, RF14, RF17, RF31 |
| GET / POST | `/backups`                                     | autenticado / ADMIN                             | RF22, RF23, RF24                   |
| GET        | `/security-guidelines`                         | autenticado                                     | RF28                               |

Regras de negócio que o front precisa conhecer:

- **Categorias:** o ADMIN vê todas; os demais perfis só as que o ADMIN liberou no cadastro do usuário. Sem categorias liberadas, a busca de documentos volta vazia. Filtrar por uma categoria não liberada também devolve lista vazia, sem 403.
- **Clientes:** o código é convertido para maiúsculas e aceita só letras, números e `-`, com até 20 caracteres. Código repetido retorna 409.
- **Documentos:** o nome é gerado pelo servidor no padrão `CLIENTE_CATEGORIA_AAAA-MM_descricao` (ex.: `EMPRESA-EXEMPLO_CONT_2026-03_balanco-patrimonial`). O período segue o formato `AAAA-MM`, e o link da nuvem precisa começar com `https://`. Cliente inativo não recebe documentos novos.
- **Backups:** o sistema só registra os backups feitos na nuvem; não faz backup. O responsável é o ADMIN que registra. `performedAt` exige data, hora e fuso (ex.: `2026-11-10T22:00:00-03:00`), e uma data no futuro retorna 400. A situação é `REALIZADO`, `VERIFICADO` ou `FALHOU`. O histórico vem do mais recente para o mais antigo.
- **Orientações de segurança:** conteúdo fixo, igual para todos os perfis, com 8 orientações (`id`, `title`, `summary`, `practices`) na ordem em que devem ser exibidas.
- **Erros:** respostas de erro de negócio têm o formato `{ "message": "..." }`, com o texto pronto para mostrar ao usuário.
- **Log:** login, cadastro de usuário, de cliente, de documento e de backup ficam registrados no log de atividades (RF26).

## HTTPS

- `npm run certs` gera um certificado autoassinado para `localhost`, `127.0.0.1` e `::1`, válido por 1 ano. O script é em Node, então funciona em Windows, Linux e macOS. Use `npm run certs -- --force` para gerar de novo.
- O servidor e o Vite (`dev` e `preview`) usam o mesmo certificado e não sobem sem ele.
- O `vite build` não precisa de certificado, por isso o build roda no CI.

## Testes

```bash
npm test
```

Os testes montam a aplicação com `buildApp()` e fazem requisições com `app.inject` do Fastify, sem abrir porta nem precisar de certificado.

## Scripts da raiz

| Comando             | O que faz                                       |
| ------------------- | ----------------------------------------------- |
| `npm run certs`     | Gera os certificados de `certs/`                |
| `npm run check`     | Biome (lint + formatação) em todo o repo        |
| `npm run check:fix` | Corrige o que o Biome consegue corrigir sozinho |
| `npm run typecheck` | TypeScript em `server` e `web`                  |
| `npm test`          | Testes (Vitest)                                 |

Para instalar uma dependência em um pacote específico: `npm install <pacote> -w web` (ou `-w server`).

O VS Code recomenda as extensões Biome e EditorConfig ao abrir o projeto e formata ao salvar. O `.gitattributes` força finais de linha LF, para evitar diffs falsos entre Windows e Linux.

## Segurança

- HTTPS em todos os ambientes, inclusive local (RNF06).
- `.env` e `certs/` nunca vão para o git.
- Todos os dados são fictícios. Não cadastre documentos, senhas ou dados reais de clientes.
