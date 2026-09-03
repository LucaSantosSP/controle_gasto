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

O sistema usa estas tabelas principais:

- `sales`: vendas cadastradas.
- `expenses`: gastos cadastrados.
- `products`: produtos em estoque.
- `product_variations`: variações de produtos, como cor, peso ou outra característica.
- `product_components`: composição dos kits cadastrados.
- `sale_stock_movements`: baixas de estoque geradas por vendas feitas a partir do estoque.

Campos principais das tabelas de vendas e gastos:

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
- `minimumStock`
- `soldQuantity`
- `manufacturingValue` como `DECIMAL(10,2)`
- `saleValue` como `DECIMAL(10,2)`
- `photoUrl`
- `createdAt`
- `updatedAt`

As imagens de produtos e kits são salvas localmente em `public/uploads/products`. A pasta é versionada com `.gitkeep`, mas as imagens enviadas são ignoradas pelo Git pelo `.gitignore` interno da própria pasta.

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
- `variationType`
- `variationValue`
- `quantity`
- `minimumStock`
- `soldQuantity`
- `manufacturingValue` como `DECIMAL(10,2)`
- `saleValue` como `DECIMAL(10,2)`

Campos principais da tabela `sale_stock_movements`:

- `id`
- `saleId`
- `productId`
- `variationId`
- `quantity`

## Funcionalidades

- Dashboard com total de vendas, total de gastos e lucro.
- Filtro do dashboard por data inicial e data final.
- Listagem de vendas e gastos recentes no dashboard.
- Cadastro, edição e exclusão de vendas.
- Cadastro, edição e exclusão de gastos.
- Cadastro, edição, duplicação, exclusão e listagem de produtos em estoque com imagem anexada, valor de fabricação e valor de venda.
- Filtro de produtos por nome ou SKU na tela de estoque.
- Criação de kits compostos por produtos e/ou outros kits existentes.
- Criação de variações de produtos, com tipo e valor da variação, estoque mínimo, estoque e preços próprios sugeridos a partir do produto matriz.
- Kits e vendas permitem selecionar variações específicas dos produtos.
- Ao adicionar itens em kits, vendas ou brindes, a escolha de produtos/kits é feita por modal com busca por nome, SKU ou variação e miniatura da foto cadastrada.
- Baixa recursiva de estoque ao vender kits, descontando o kit vendido e todos os itens que o compõem.
- Alertas críticos quando o estoque cadastrado de um kit não pode ser sustentado pelos produtos, kits ou variações da composição.
- Controle de quantidade vendida por produto, editável manualmente e atualizado ao lançar venda pelo estoque.
- Controle de estoque mínimo para produtos, kits e variações.
- Imagem opcional no estoque, com ícone padrão quando não houver imagem.
- Imagens de produtos/kits são armazenadas em `public/uploads/products` e removidas automaticamente quando o produto é excluído ou quando a imagem é substituída.
- Kits sem foto própria exibem miniaturas das imagens dos itens que compõem o kit.
- Alerta visual em produtos sem estoque, abaixo do mínimo, com variações sem estoque, variações abaixo do mínimo ou kits críticos.
- Sino de notificações para itens sem estoque, abaixo do mínimo e kits críticos, com navegação direta até o produto ou abertura do modal de variações com foco na variação afetada.
- Lançamento de venda diretamente pelo estoque com quantidade vendida, desconto, valor final manual e plataforma.
- Venda única com múltiplos produtos e/ou kits pelo modal `Vendido`.
- Venda pelo estoque com brindes vindos de produtos/kits cadastrados, baixando estoque sem somar receita.
- Exibição do custo de fabricação dos itens vendidos, dos brindes e do total no modal de venda.
- Ao excluir uma venda feita pelo estoque, os produtos e kits daquela venda voltam automaticamente ao estoque.
- Cards de produto exibem apenas resumo das variações; os detalhes abrem em modal próprio.
- Modais fecham ao clicar fora da área de conteúdo, mantendo o botão `Fechar` disponível.
- Cálculo automático de taxas Shopee para vendas marcadas como `Vendido na Shopee`.
- Cálculo do total em tempo real nos formulários.
- Validações no servidor com Zod.
- Formatação brasileira de moeda e data.
