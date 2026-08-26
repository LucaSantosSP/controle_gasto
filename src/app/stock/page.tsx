import { StockManager } from "@/components/stock-manager";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const products = await prisma.product.findMany({ orderBy: { sku: "asc" } });

  return (
    <StockManager
      products={products.map((product) => ({
        id: product.id,
        sku: product.sku,
        name: product.name,
        quantity: product.quantity,
        soldQuantity: product.soldQuantity,
        manufacturingValue: product.manufacturingValue.toString(),
        saleValue: product.saleValue.toString(),
        photoUrl: product.photoUrl,
      }))}
    />
  );
}
