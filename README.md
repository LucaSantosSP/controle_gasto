# Fluxo

Sistema web local para fluxo simples de vendas, gastos, estoque e lucro de uma pequena loja.

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

O sistema usa três tabelas:

- `sales`: vendas cadastradas.
- `expenses`: gastos cadastrados.
- `products`: produtos em estoque.

Campos principais das duas tabelas:

- `id`
- `sku`, único
- `name`
- `unitValue` como `DECIMAL(10,2)`
- `quantity`
- `grossValue` como `DECIMAL(10,2)`
- `discountValue` como `DECIMAL(10,2)`
- `platformFeeValue` como `DECIMAL(10,2)`
- `totalValue` como `DECIMAL(10,2)`
- `platform`
- `date`
- `createdAt`
- `updatedAt`

O `totalValue` sempre é calculado no servidor como:

```text
unitValue * quantity
```

Campos principais da tabela `products`:

- `id`
- `name`
- `quantity`
- `soldQuantity`
- `manufacturingValue` como `DECIMAL(10,2)`
- `saleValue` como `DECIMAL(10,2)`
- `photoUrl`
- `createdAt`
- `updatedAt`

## Funcionalidades

- Dashboard com total de vendas, total de gastos e lucro.
- Filtro do dashboard por data inicial e data final.
- Listagem de vendas e gastos recentes no dashboard.
- Cadastro, edição e exclusão de vendas.
- Cadastro, edição e exclusão de gastos.
- Cadastro, edição, duplicação, exclusão e listagem de produtos em estoque com foto por URL, valor de fabricação e valor de venda.
- Controle de quantidade vendida por produto, editável manualmente e atualizado ao lançar venda pelo estoque.
- URL de foto opcional no estoque, com ícone padrão quando não houver imagem.
- Alerta visual em produtos sem estoque.
- Lançamento de venda diretamente pelo estoque com quantidade vendida, desconto, valor final manual e plataforma.
- Cálculo automático de taxas Shopee para vendas marcadas como `Vendido na Shopee`.
- Cálculo do total em tempo real nos formulários.
- Validações no servidor com Zod.
- Formatação brasileira de moeda e data.
