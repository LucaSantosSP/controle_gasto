import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NotificationBell } from "./notification-bell";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/sales", label: "Vendas" },
  { href: "/expenses", label: "Gastos" },
  { href: "/stock", label: "Estoque" },
];

export async function Nav() {
  const [stockAlertProducts, stockAlertVariations, productsForKitAlerts, kitComponents] = await Promise.all([
    prisma.product.findMany({
      where: {
        OR: [{ quantity: 0 }, { AND: [{ quantity: { gt: 0 } }, { minimumStock: { gt: 0 } }, { quantity: { lt: prisma.product.fields.minimumStock } }] }],
      },
      orderBy: { sku: "asc" },
      select: { id: true, sku: true, name: true, quantity: true, minimumStock: true },
    }),
    prisma.productVariation.findMany({
      where: {
        OR: [{ quantity: 0 }, { AND: [{ quantity: { gt: 0 } }, { minimumStock: { gt: 0 } }, { quantity: { lt: prisma.productVariation.fields.minimumStock } }] }],
      },
      orderBy: [{ product: { sku: "asc" } }, { name: "asc" }],
      select: { id: true, sku: true, name: true, variationType: true, variationValue: true, quantity: true, minimumStock: true, productId: true, product: { select: { sku: true, name: true } } },
    }),
    prisma.product.findMany({
      select: {
        id: true,
        sku: true,
        name: true,
        isKit: true,
        quantity: true,
        variations: { select: { id: true, quantity: true } },
      },
    }),
    prisma.productComponent.findMany({ select: { kitId: true, componentId: true, variationId: true, quantity: true } }),
  ]);
  const kitStockAlerts = findKitStockAlerts(productsForKitAlerts, kitComponents);
  const outOfStockItems = [
    ...stockAlertProducts.map((product) => ({
      id: `product-${product.id}`,
      href: `/stock?focusProduct=${product.id}#product-${product.id}`,
      sku: product.sku,
      name: product.name,
      type: "product" as const,
      status: product.quantity <= 0 ? "out" as const : "low" as const,
    })),
    ...stockAlertVariations.map((variation) => ({
      id: `variation-${variation.id}`,
      href: `/stock?focusProduct=${variation.productId}&focusVariation=${variation.id}#product-${variation.productId}`,
      sku: variation.sku || variation.product.sku,
      name: `${variation.product.name} - ${formatVariationLabel(variation)}`,
      type: "variation" as const,
      status: variation.quantity <= 0 ? "out" as const : "low" as const,
    })),
    ...kitStockAlerts.map((kit) => ({
      id: `kit-${kit.id}`,
      href: `/stock?focusProduct=${kit.id}#product-${kit.id}`,
      sku: kit.sku,
      name: kit.name,
      type: "kit" as const,
      status: "critical" as const,
    })),
  ];

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="flex items-center gap-3 text-xl font-bold text-slate-950">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
            <svg
              aria-hidden="true"
              viewBox="0 0 64 64"
              fill="none"
              className="h-8 w-8"
            >
              <path d="M17 28c0-10 8-18 18-18h10" stroke="#16c784" strokeWidth="5" strokeLinecap="round" />
              <path d="M45 6l8 8-8 8" stroke="#16c784" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M47 36c0 10-8 18-18 18H19" stroke="#0f243c" strokeWidth="5" strokeLinecap="round" />
              <path d="M19 58l-8-8 8-8" stroke="#0f243c" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="26" y="32" width="5" height="10" rx="1" fill="#16c784" />
              <rect x="34" y="27" width="5" height="15" rx="1" fill="#16c784" />
              <rect x="42" y="21" width="5" height="21" rx="1" fill="#16c784" />
            </svg>
          </span>
          Fluxo
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <nav className="flex flex-wrap gap-2 text-sm font-medium text-slate-700">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-slate-200 px-4 py-2 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <NotificationBell products={outOfStockItems} />
        </div>
      </div>
    </header>
  );
}

function formatVariationLabel(variation: { name: string; variationType: string; variationValue: string }) {
  const typeValue = [variation.variationType, variation.variationValue].filter(Boolean).join(": ");

  return typeValue ? `${variation.name} (${typeValue})` : variation.name;
}

function findKitStockAlerts(
  products: Array<{ id: number; sku: string; name: string; isKit: boolean; quantity: number; variations: Array<{ id: number; quantity: number }> }>,
  components: Array<{ kitId: number; componentId: number; variationId: number | null; quantity: number }>
) {
  return products.filter((product) => {
    if (!product.isKit || product.quantity <= 0) {
      return false;
    }

    const required = calculateKitRequiredComponents(product.id, product.quantity, components);

    for (const movement of required.values()) {
      const component = products.find((item) => item.id === movement.productId);
      const stockQuantity = movement.variationId ? component?.variations.find((variation) => variation.id === movement.variationId)?.quantity : component?.quantity;

      if ((stockQuantity ?? 0) < movement.quantity) {
        return true;
      }
    }

    return false;
  });
}

function calculateKitRequiredComponents(
  kitId: number,
  quantity: number,
  components: Array<{ kitId: number; componentId: number; variationId: number | null; quantity: number }>
) {
  const required = new Map<string, { productId: number; variationId: number | null; quantity: number }>();
  const componentsByKit = new Map<number, Array<{ componentId: number; variationId: number | null; quantity: number }>>();

  for (const component of components) {
    const kitComponents = componentsByKit.get(component.kitId) ?? [];
    kitComponents.push({ componentId: component.componentId, variationId: component.variationId, quantity: component.quantity });
    componentsByKit.set(component.kitId, kitComponents);
  }

  addRequiredKitComponents(kitId, quantity, componentsByKit, required, new Set<number>());

  return required;
}

function addRequiredKitComponents(
  kitId: number,
  quantity: number,
  componentsByKit: Map<number, Array<{ componentId: number; variationId: number | null; quantity: number }>>,
  required: Map<string, { productId: number; variationId: number | null; quantity: number }>,
  visiting: Set<number>
) {
  if (visiting.has(kitId)) {
    return;
  }

  visiting.add(kitId);

  for (const component of componentsByKit.get(kitId) ?? []) {
    const componentQuantity = quantity * component.quantity;
    const key = `${component.componentId}:${component.variationId ?? ""}`;
    const current = required.get(key);

    required.set(key, {
      productId: component.componentId,
      variationId: component.variationId,
      quantity: (current?.quantity ?? 0) + componentQuantity,
    });
    addRequiredKitComponents(component.componentId, componentQuantity, componentsByKit, required, visiting);
  }

  visiting.delete(kitId);
}
