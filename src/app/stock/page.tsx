import { StockManager } from "@/components/stock-manager";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const products = await prisma.product.findMany({
    orderBy: { sku: "asc" },
    include: {
      variations: { orderBy: { name: "asc" } },
      kitComponents: {
        orderBy: { component: { sku: "asc" } },
        include: { component: true, variation: true },
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
        variations: product.variations.map((variation) => ({
          id: variation.id,
          sku: variation.sku ?? "",
          name: variation.name,
          quantity: variation.quantity,
          soldQuantity: variation.soldQuantity,
          manufacturingValue: variation.manufacturingValue.toString(),
          saleValue: variation.saleValue.toString(),
        })),
        components: product.kitComponents.map((component) => ({
          componentId: component.componentId,
          variationId: component.variationId,
          sku: component.component.sku,
          name: component.variation ? `${component.component.name} - ${component.variation.name}` : component.component.name,
          quantity: component.quantity,
          isKit: component.component.isKit,
          photoUrl: component.component.photoUrl,
        })),
      }))}
    />
  );
}
