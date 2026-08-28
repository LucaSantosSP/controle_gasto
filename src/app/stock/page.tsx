import { StockManager } from "@/components/stock-manager";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const products = await prisma.product.findMany({
    orderBy: { sku: "asc" },
    include: {
      kitComponents: {
        orderBy: { component: { sku: "asc" } },
        include: { component: true },
      },
    },
  });

  return (
    <StockManager
      products={products.map((product) => ({
        id: product.id,
        sku: product.sku,
        name: product.name,
        isKit: product.isKit,
        quantity: product.quantity,
        soldQuantity: product.soldQuantity,
        manufacturingValue: product.manufacturingValue.toString(),
        saleValue: product.saleValue.toString(),
        photoUrl: product.photoUrl,
        components: product.kitComponents.map((component) => ({
          componentId: component.componentId,
          sku: component.component.sku,
          name: component.component.name,
          quantity: component.quantity,
          isKit: component.component.isKit,
          photoUrl: component.component.photoUrl,
        })),
      }))}
    />
  );
}
