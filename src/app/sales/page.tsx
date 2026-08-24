import { TransactionManager } from "@/components/transaction-manager";
import { prisma } from "@/lib/prisma";
import { createSale, deleteSale, updateSale } from "./actions";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const sales = await prisma.sale.findMany({ orderBy: [{ date: "desc" }, { id: "desc" }] });

  return (
    <TransactionManager
      title="Vendas"
      newLabel="+ Nova venda"
      emptyLabel="Nenhuma venda cadastrada."
      records={sales.map((sale) => ({
        id: sale.id,
        name: sale.name,
        unitValue: sale.unitValue.toString(),
        quantity: sale.quantity,
        grossValue: sale.grossValue.toString(),
        discountValue: sale.discountValue.toString(),
        platformFeeValue: sale.platformFeeValue.toString(),
        totalValue: sale.totalValue.toString(),
        platform: sale.platform,
        date: sale.date.toISOString(),
      }))}
      createAction={createSale}
      updateAction={updateSale}
      deleteAction={deleteSale}
    />
  );
}
