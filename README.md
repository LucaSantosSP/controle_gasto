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
- `product_variations`: variações de produtos, como cor, peso ou outra característica.
- `product_components`: composição dos kits cadastrados.
- `sale_stock_movements`: baixas de estoque geradas por vendas feitas a partir do estoque.

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
- `isKit`
- `quantity`
- `soldQuantity`
- `manufacturingValue` como `DECIMAL(10,2)`
- `saleValue` como `DECIMAL(10,2)`
- `photoUrl`
- `createdAt`
- `updatedAt`

Campos principais da tabela `product_components`:

- `id`
- `kitId`
- `componentId`
- `variationId`
- `quantity`

Campos principais da tabela `product_variations`:

- `id`
- `productId`
- `sku`
- `name`
- `quantity`
- `soldQuantity`
- `manufacturingValue` como `DECIMAL(10,2)`
- `saleValue` como `DECIMAL(10,2)`

Campos principais da tabela `sale_stock_movements`:

- `id`
- `saleId`
- `productId`
- `quantity`

## Funcionalidades

- Dashboard com total de vendas, total de gastos e lucro.
- Filtro do dashboard por data inicial e data final.
- Listagem de vendas e gastos recentes no dashboard.
- Cadastro, edição e exclusão de vendas.
- Cadastro, edição e exclusão de gastos.
- Cadastro, edição, duplicação, exclusão e listagem de produtos em estoque com foto por URL, valor de fabricação e valor de venda.
- Filtro de produtos por nome ou SKU na tela de estoque.
- Criação de kits compostos por produtos e/ou outros kits existentes.
- Criação de variações de produtos, com estoque e preços próprios sugeridos a partir do produto matriz.
- Kits e vendas permitem selecionar variações específicas dos produtos.
- Ao adicionar itens em kits ou vendas, a escolha de produtos/kits é feita por modal com busca por nome, SKU ou variação.
- Baixa recursiva de estoque ao vender kits, descontando o kit vendido e todos os itens que o compõem.
- Controle de quantidade vendida por produto, editável manualmente e atualizado ao lançar venda pelo estoque.
- URL de foto opcional no estoque, com ícone padrão quando não houver imagem.
- Kits sem foto própria exibem miniaturas das imagens dos itens que compõem o kit.
- Alerta visual em produtos sem estoque.
- Lançamento de venda diretamente pelo estoque com quantidade vendida, desconto, valor final manual e plataforma.
- Venda única com múltiplos produtos e/ou kits pelo modal `Vendido`.
- Ao excluir uma venda feita pelo estoque, os produtos e kits daquela venda voltam automaticamente ao estoque.
- Cálculo automático de taxas Shopee para vendas marcadas como `Vendido na Shopee`.
- Cálculo do total em tempo real nos formulários.
- Validações no servidor com Zod.
- Formatação brasileira de moeda e data.
