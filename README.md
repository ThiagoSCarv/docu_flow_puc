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

### Demonstração (front e API na mesma origem)

```bash
npm run db:up
npm run demo         # build do web e do server, depois sobe tudo em https://localhost:3333
```

O Fastify serve o build do React (`web/dist`) e a API com o mesmo certificado, na mesma origem: front em `https://localhost:3333`, API em `/api` e docs em `/docs`. Recarregar a página em qualquer rota do front (ex.: `/documentos`) funciona, porque o servidor devolve o `index.html`. Sem `web/dist`, o servidor sobe só com a API, como no `dev:server`.

### Banco de dados

```bash
npm run db:up                      # sobe o PostgreSQL no Docker
npm run db:migrate -w server       # cria/atualiza as tabelas
npm run db:seed -w server          # categorias iniciais + admin (SEED_ADMIN_* do .env)
npm run db:seed:demo -w server     # o mesmo + dados fictícios para testar (SEED_DEMO_PASSWORD do .env)
npm run db:down                    # derruba
```

O `db:seed:demo` deixa o banco pronto para testar e demonstrar com volume de escritório real. Leva cerca de 2 segundos. Os dados passam pelas regras do domínio (nome padronizado, período, código de cliente) e cada criação entra no log de atividades. Rodar de novo não duplica nada, e tudo é fictício:

- **Usuários (500):** todos com a senha `SEED_DEMO_PASSWORD` (`demo12345` no `.env.example`). Para entrar, use `funcionario@exemplo.com` (FUNCIONARIO, categorias Contábeis, Fiscais e Financeiros) ou `consulta@exemplo.com` (CONSULTA, Contábeis e Fiscais). Os demais seguem o padrão `funcionario.0003@exemplo.com` / `consulta.0004@exemplo.com`, com combinações variadas de categorias. O admin continua sendo o do `SEED_ADMIN_*`.
- **Clientes (1000):** `CLI-0001` a `CLI-1000`, com nomes como "Comércio Exemplo 0001 Ltda".
- **Documentos (3250):** 3 ou 4 por cliente, espalhados pelas seis categorias e pelos meses de janeiro a outubro de 2026, com links fictícios em `nuvem.exemplo.com`.
- **Backups (1000):** um por dia, terminando ontem às 22h. A maioria está `VERIFICADO`, 1 a cada 20 aparece como `FALHOU` e os 3 mais recentes como `REALIZADO` (aguardando verificação).

Entrar com cada perfil mostra a restrição por categoria: o FUNCIONARIO não vê Contratos, Administrativos nem Outros, e o CONSULTA vê só Contábeis e Fiscais.

O PostgreSQL do Docker sobe com SSL ligado, usando o mesmo certificado de `certs/` (rode `npm run certs` antes do `db:up`). Com `DATABASE_SSL=true` no `server/.env`, o servidor se conecta ao banco por TLS e confia só no `certs/cert.pem`: um certificado diferente faz a conexão falhar. Para conferir na demonstração, com o servidor rodando e depois de pelo menos uma requisição (ex.: login):

```bash
docker compose exec db psql -U organizadoc -c "SELECT a.client_addr, s.ssl, s.version FROM pg_stat_ssl s JOIN pg_stat_activity a USING (pid) WHERE a.client_addr IS NOT NULL;"
```

As conexões do servidor aparecem com `ssl = t` e `version = TLSv1.3`.

Ao alterar `server/src/infra/database/schema.ts`, gere a migration com `npm run db:generate -w server -- --name <descricao>` e faça commit da pasta `server/drizzle/` junto.

## Comunicação entre web e server

- **Prefixo `/api`:** todas as rotas da API começam com `/api` (ex.: `/api/health`, `/api/auth/login`). Assim elas não colidem com as rotas do React Router quando o Fastify serve o build do front. Rota inexistente sob `/api` devolve 404 em JSON.
- **Caminhos relativos:** o front chama sempre `fetch('/api/...')`. Em desenvolvimento, o Vite repassa essas chamadas para `https://localhost:3333` (proxy). Na demonstração (`npm run demo`), front e API ficam na mesma origem. Nos dois casos não há CORS nem URL fixa no código. Para apontar para outra API em dev: `API_URL=https://outro-host npm run dev:web`.
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
| `npm run demo`      | Build do web e do server e sobe tudo na 3333    |
| `npm run check`     | Biome (lint + formatação) em todo o repo        |
| `npm run check:fix` | Corrige o que o Biome consegue corrigir sozinho |
| `npm run typecheck` | TypeScript em `server` e `web`                  |
| `npm test`          | Testes (Vitest)                                 |

Para instalar uma dependência em um pacote específico: `npm install <pacote> -w web` (ou `-w server`).

O VS Code recomenda as extensões Biome e EditorConfig ao abrir o projeto e formata ao salvar. O `.gitattributes` força finais de linha LF, para evitar diffs falsos entre Windows e Linux.

## Situação do projeto

### Pronto (servidor)

| Requisito                    | Entrega                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------- |
| RF01, RF02, RF05             | Cadastro de usuários pelo ADMIN, login por e-mail e senha, três perfis          |
| RF06, RF08                   | Cadastro e consulta de clientes fictícios                                       |
| RF09, RF11, RF12, RF14, RF17 | Cadastro de documento com cliente, categoria, período e link da nuvem           |
| RF15, RF19                   | Busca por nome, categoria, cliente e período, restrita às categorias            |
| RF22, RF23, RF24             | Registro e histórico de backups                                                 |
| RF26                         | Log de login e de cadastros                                                     |
| RF28                         | Orientações educativas de segurança                                             |
| RF31                         | Nome padronizado `CLIENTE_CATEGORIA_AAAA-MM_descricao`                          |
| RNF04, RNF13, RNF14, RNF15   | bcrypt, bloqueio após 5 falhas, JWT de 1 hora, senha forte                      |
| RNF05, RNF06, RNF07, RNF10   | Permissões no servidor, HTTPS, validação com Zod, respostas sem dados sensíveis |

### Falta

- **Servidor:** recusar documento com nome padronizado repetido; rota para o ADMIN redefinir a senha de um usuário.
- **Front:** telas de login, documentos, clientes, backups e orientações (hoje o `web/` só confere a conexão com a API).
- **Produção:** o Fastify servir o build do React na mesma origem (`@fastify/static`).
- **Opcional:** SSL entre servidor e PostgreSQL; script de `pg_dump`; requisitos desejáveis (RF04, RF07, RF10, RF20, RF25, RF27, RF29).

## Segurança

- HTTPS em todos os ambientes, inclusive local (RNF06).
- `.env` e `certs/` nunca vão para o git.
- Todos os dados são fictícios. Não cadastre documentos, senhas ou dados reais de clientes.
