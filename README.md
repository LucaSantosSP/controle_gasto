# Controle da Loja

Sistema web local para controle simples de vendas, gastos e lucro de uma pequena loja.

## Tecnologias

- Next.js com App Router
- TypeScript
- React
- Prisma ORM
- MySQL
- Tailwind CSS
- Zod

## Requisitos

- Node.js instalado, preferencialmente versão LTS recente.
- MySQL instalado e rodando localmente.
- Um terminal na pasta do projeto.

## 1. Criar o banco MySQL

Acesse o MySQL e execute:

```sql
CREATE DATABASE controle_loja
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

## 2. Configurar variáveis de ambiente

Copie o arquivo `.env.example` para `.env` e ajuste usuário, senha, host, porta e nome do banco conforme sua instalação local do MySQL.

Exemplo:

```env
DATABASE_URL="mysql://root:senha@localhost:3306/controle_loja"
```

Não coloque senhas reais no repositório.

## 3. Instalar dependências

```bash
npm install
```

No Windows, se o PowerShell bloquear `npm`, use:

```bash
npm.cmd install
```

## 4. Gerar Prisma Client

```bash
npx prisma generate
```

No Windows, se necessário:

```bash
npx.cmd prisma generate
```

## 5. Executar migrations

```bash
npx prisma migrate dev
```

No Windows, se necessário:

```bash
npx.cmd prisma migrate dev
```

## 6. Executar a aplicação

```bash
npm run dev
```

No Windows, se necessário:

```bash
npm.cmd run dev
```

Depois acesse:

```text
http://localhost:3000
```

## Comandos úteis

```bash
npm run lint
npm run typecheck
npm run build
```

## Modelo do banco

O sistema usa duas tabelas:

- `sales`: vendas cadastradas.
- `expenses`: gastos cadastrados.

Campos principais das duas tabelas:

- `id`
- `name`
- `unitValue` como `DECIMAL(10,2)`
- `quantity`
- `totalValue` como `DECIMAL(10,2)`
- `date`
- `createdAt`
- `updatedAt`

O `totalValue` sempre é calculado no servidor como:

```text
unitValue * quantity
```

## Funcionalidades

- Dashboard com total de vendas, total de gastos e lucro.
- Filtro do dashboard por data inicial e data final.
- Listagem de vendas e gastos recentes no dashboard.
- Cadastro, edição e exclusão de vendas.
- Cadastro, edição e exclusão de gastos.
- Cálculo do total em tempo real nos formulários.
- Validações no servidor com Zod.
- Formatação brasileira de moeda e data.
