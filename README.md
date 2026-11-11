# OrganizaDoc

Catálogo de documentos digitais para um escritório de contabilidade (Projeto Integrador III-A, PUC Goiás). Arquitetura cliente-servidor com comunicação protegida por HTTPS/TLS.

## Estrutura

Monorepo com **npm workspaces**:

| Pasta      | O que é                                        | Responsável |
| ---------- | ---------------------------------------------- | ----------- |
| `server/`  | API REST (Fastify 5, Drizzle, PostgreSQL, Zod) | back-end    |
| `web/`     | Interface (React + Vite, TanStack Query)       | front-end   |
| `scripts/` | Utilitários (geração de certificados)          | ambos       |
| `certs/`   | Certificados locais (gerados, fora do git)     | —           |

O back-end segue DDD e Clean Architecture. As dependências apontam para dentro: `infra` → `application` → `domain` → `shared`.

```
server/
├── src/
│   ├── shared/         # enums (utils/enums.ts) e erro base de domínio
│   ├── domain/         # entidades, value objects, interfaces de repositório, por contexto
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

Ao alterar `server/src/db/schema.ts`, gere a migration com `npm run db:generate -w server -- --name <descricao>` e faça commit da pasta `server/drizzle/` junto.

## Comunicação entre web e server

- **Prefixo `/api`:** todas as rotas da API começam com `/api` (ex.: `/api/health`, `/api/auth/login`). Assim elas não colidem com as rotas do React Router quando o Fastify passar a servir o build do front.
- **Caminhos relativos:** o front chama sempre `fetch('/api/...')`. Em desenvolvimento, o Vite repassa essas chamadas para `https://localhost:3333` (proxy). Em produção, front e API ficam na mesma origem. Nos dois casos não há CORS nem URL fixa no código. Para apontar para outra API em dev: `API_URL=https://outro-host npm run dev:web`.
- **Contrato:** a documentação OpenAPI em **https://localhost:3333/docs** é gerada automaticamente a partir dos schemas Zod das rotas. É a referência do front para formatos de requisição e resposta.
- **Autenticação:** `POST /api/auth/login` com `{ email, password }` devolve `{ token }`, válido por 1 hora. As demais rotas recebem o header `Authorization: Bearer <token>`. `GET /api/auth/me` devolve o usuário logado (nome, e-mail, perfil). Respostas: 401 para credenciais inválidas ou token ausente/expirado, 403 para perfil sem permissão, 423 para conta bloqueada após 5 tentativas (15 minutos), 429 para mais de 10 tentativas de login por minuto. No `/docs`, use o botão **Authorize** com o token para testar as rotas protegidas.
- **Health check:** `GET /api/health` retorna `{ "status": "ok" }` e serve para confirmar que o cliente alcança o servidor via HTTPS.

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

## Fluxo de trabalho da dupla

1. Atualize a `main` antes de começar: `git pull`
2. Crie uma branch por tarefa: `git switch -c feat/web-login` ou `feat/server-documentos`
3. Mexa só na sua pasta (`web/` ou `server/`). Mudanças na raiz (`package.json`, `biome.json`, CI) devem ser combinadas antes
4. Antes de abrir o PR, rode `npm run check && npm run typecheck && npm test`
5. Abra o Pull Request para a `main`. O CI (`.github/workflows/ci.yml`) roda as mesmas verificações e o build do front. A outra pessoa revisa e faz o merge

Se a API precisar de um campo ou rota nova, combinem pelo PR ou por uma issue, e confiram o resultado em `/docs`.

## Segurança

- HTTPS em todos os ambientes, inclusive local (RNF06).
- `.env` e `certs/` nunca vão para o git.
- Todos os dados são fictícios. Não cadastre documentos, senhas ou dados reais de clientes.
