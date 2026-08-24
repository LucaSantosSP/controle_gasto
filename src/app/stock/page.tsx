import { StockManager } from "@/components/stock-manager";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <StockManager
      products={products.map((product) => ({
        id: product.id,
        name: product.name,
        quantity: product.quantity,
        manufacturingValue: product.manufacturingValue.toString(),
        saleValue: product.saleValue.toString(),
        photoUrl: product.photoUrl,
      }))}
    />
  );
}
