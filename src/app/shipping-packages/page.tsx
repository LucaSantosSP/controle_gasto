import { ShippingPackageManager } from "@/components/shipping-package-manager";
import { prisma } from "@/lib/prisma";
import { createShippingPackage, deleteShippingPackage, updateShippingPackage } from "./actions";

export const dynamic = "force-dynamic";

export default async function ShippingPackagesPage() {
  const shippingPackages = await prisma.shippingPackage.findMany({ orderBy: { name: "asc" } });

  return (
    <ShippingPackageManager
      packages={shippingPackages.map((shippingPackage) => ({
        id: shippingPackage.id,
        name: shippingPackage.name,
        quantity: shippingPackage.quantity,
        totalValue: shippingPackage.totalValue.toString(),
        unitValue: shippingPackage.unitValue.toString(),
      }))}
      createAction={createShippingPackage}
      updateAction={updateShippingPackage}
      deleteAction={deleteShippingPackage}
    />
  );
}
