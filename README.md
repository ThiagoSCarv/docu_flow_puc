# OrganizaDoc

Catálogo de documentos digitais para um escritório de contabilidade, desenvolvido no Projeto Integrador III-A (Análise e Desenvolvimento de Sistemas, PUC Goiás). Aplicação cliente-servidor com comunicação protegida por HTTPS/TLS.

## Visão geral

O escritório guarda os arquivos na nuvem, mas tinha dificuldade para organizá-los e controlar quem acessa os dados dos clientes. O OrganizaDoc funciona como uma camada de organização sobre essa nuvem: registra os metadados de cada documento (cliente, categoria, período, link e responsável), sem armazenar os arquivos.

Principais funcionalidades:

- **Documentos:** cadastro com nome padronizado (`CLIENTE_CATEGORIA_AAAA-MM_descricao`), link para a nuvem e busca por nome, categoria, cliente e período.
- **Clientes:** cadastro, consulta, edição e inativação sem perder o histórico.
- **Usuários e acesso:** cadastro feito pelo administrador, três perfis (ADMIN, FUNCIONARIO e CONSULTA) e visualização restrita às categorias liberadas para cada usuário.
- **Backups:** registro e histórico dos backups feitos na nuvem, com destaque para os pendentes de verificação. O sistema não faz backup, só acompanha.
- **Log de atividades:** logins, cadastros e mudanças de permissão ficam registrados para consulta do administrador.
- **Painel:** indicadores de documentos, clientes e backups na página inicial.
- **Orientações de segurança:** conteúdo educativo sobre golpes e boas práticas.

Segurança aplicada: HTTPS em todos os ambientes, senhas com hash bcrypt, bloqueio após 5 tentativas de login, token com validade de 1 hora, permissões verificadas no servidor, validação de toda entrada e conexão com o banco por TLS.

Todos os dados são fictícios. Não cadastre documentos, senhas ou dados reais de clientes.

## Tecnologias

| Parte    | Tecnologias                                         |
| -------- | --------------------------------------------------- |
| Servidor | Node.js 22, TypeScript, Fastify 5, Drizzle ORM, Zod |
| Banco    | PostgreSQL 17 (Docker)                              |
| Front    | React 19, Vite, React Router, TanStack Query        |
| Testes   | Vitest (banco em memória com PGlite, sem Docker)    |
| Outros   | Biome (lint e formatação), Swagger em `/docs`       |

## Estrutura

Monorepo com **npm workspaces**:

| Pasta      | O que é                                                      |
| ---------- | ------------------------------------------------------------ |
| `server/`  | API REST em camadas (domínio, casos de uso e infraestrutura) |
| `web/`     | Interface web que consome a API                              |
| `scripts/` | Utilitários (geração de certificados)                        |
| `certs/`   | Certificados locais (gerados, fora do git)                   |

O front e a API se comunicam por HTTPS. Todas as rotas da API ficam sob `/api`, e a documentação interativa, gerada automaticamente, fica em `https://localhost:3333/docs`.

## Pré-requisitos

- Node.js 22 ou superior (`.nvmrc`)
- Docker (para o PostgreSQL)

## Como rodar

### 1. Preparar o ambiente (uma vez)

```bash
npm install                        # instala server e web
npm run certs                      # gera o certificado HTTPS em certs/
cp server/.env.example server/.env
```

No `server/.env`, troque `JWT_SECRET` (mínimo 32 caracteres) e `SEED_ADMIN_PASSWORD`. Para gerar um segredo:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### 2. Subir e preparar o banco

```bash
npm run db:up                      # sobe o PostgreSQL no Docker (com SSL)
npm run db:migrate -w server       # cria as tabelas
npm run db:seed -w server          # categorias iniciais e o usuário administrador
```

Para ter dados fictícios de exemplo (1000 clientes, 3250 documentos, 1000 backups e 500 usuários), rode também:

```bash
npm run db:seed:demo -w server
```

### 3. Rodar a aplicação

**Demonstração** (front e API juntos, em uma única origem):

```bash
npm run demo                       # abre em https://localhost:3333
```

**Desenvolvimento** (em dois terminais, com recarga automática):

```bash
npm run dev:server                 # API em https://localhost:3333
npm run dev:web                    # front em https://localhost:5173
```

### 4. Entrar no sistema

- **Administrador:** e-mail e senha definidos em `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` no `server/.env`.
- **Com os dados de exemplo:** `funcionario@exemplo.com` (FUNCIONARIO) e `consulta@exemplo.com` (CONSULTA), com a senha `SEED_DEMO_PASSWORD` do `.env`. Entrar com cada perfil mostra a restrição de acesso por categoria.

Para derrubar o banco: `npm run db:down`.

## Certificado HTTPS

O `npm run certs` gera um certificado autoassinado para `localhost`, válido por 1 ano. Por isso o navegador mostra "Não seguro": a conexão é criptografada, mas o certificado não foi emitido por uma autoridade que o navegador conhece. Para o aviso sumir, importe o `certs/cert.pem` como confiável e reabra o navegador:

- **Linux (Chrome/Chromium):** com o navegador fechado, rode `certutil -d sql:$HOME/.pki/nssdb -A -t "P,," -n organizadoc-localhost -i certs/cert.pem` (pacote `nss-tools` ou `libnss3-tools`).
- **Windows:** dê dois cliques no `certs/cert.pem` → Instalar certificado → Usuário atual → "Autoridades de Certificação Raiz Confiáveis".

Se o certificado for gerado de novo (`npm run certs -- --force`), repita a importação.

## Testes e qualidade

```bash
npm test                           # testes automatizados (não precisam de Docker)
npm run check                      # lint e formatação (Biome)
npm run typecheck                  # checagem de tipos em server e web
```

O CI roda essas verificações e o build do front em todo pull request.
