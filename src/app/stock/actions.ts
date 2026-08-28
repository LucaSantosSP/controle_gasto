"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { calculateShopeeFee, roundMoney } from "@/lib/shopee";
import { parseKitComponents, parseProductFormData, parseSellProductFormData } from "@/lib/validation";
import type { ActionState } from "@/types/transaction";

export async function createProduct(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseProductFormData(formData);

  if (!parsed.success) {
    return { ok: false, message: "Corrija os campos destacados.", errors: parsed.error.flatten().fieldErrors };
  }

  try {
    await prisma.product.create({
      data: {
        sku: parsed.data.sku,
        name: parsed.data.name,
        isKit: false,
        quantity: parsed.data.quantity,
        soldQuantity: parsed.data.soldQuantity,
        manufacturingValue: new Prisma.Decimal(parsed.data.manufacturingValue),
        saleValue: new Prisma.Decimal(parsed.data.saleValue),
        photoUrl: parsed.data.photoUrl,
      },
    });

    revalidatePath("/stock");
    return { ok: true, message: "Produto cadastrado com sucesso." };
  } catch (error) {
    if (isDuplicateSkuError(error)) {
      return { ok: false, message: "Já existe um produto com este SKU.", errors: { sku: ["Este SKU já está em uso."] } };
    }

    return { ok: false, message: "Não foi possível cadastrar o produto." };
  }
}

export async function updateProduct(_: ActionState, formData: FormData): Promise<ActionState> {
  const id = Number(formData.get("id"));
  const parsed = parseProductFormData(formData);

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Produto inválido." };
  }

  if (!parsed.success) {
    return { ok: false, message: "Corrija os campos destacados.", errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const productWithSku = await prisma.product.findUnique({
      where: { sku: parsed.data.sku },
      select: { id: true },
    });

    if (productWithSku && productWithSku.id !== id) {
      return { ok: false, message: "Já existe um produto com este SKU.", errors: { sku: ["Este SKU já está em uso."] } };
    }

    await prisma.product.update({
      where: { id },
      data: {
        sku: parsed.data.sku,
        name: parsed.data.name,
        quantity: parsed.data.quantity,
        soldQuantity: parsed.data.soldQuantity,
        manufacturingValue: new Prisma.Decimal(parsed.data.manufacturingValue),
        saleValue: new Prisma.Decimal(parsed.data.saleValue),
        photoUrl: parsed.data.photoUrl,
      },
    });

    revalidatePath("/stock");
    return { ok: true, message: "Produto atualizado com sucesso." };
  } catch (error) {
    if (isDuplicateSkuError(error)) {
      return { ok: false, message: "Já existe um produto com este SKU.", errors: { sku: ["Este SKU já está em uso."] } };
    }

    return { ok: false, message: "Não foi possível atualizar o produto." };
  }
}

export async function createKit(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseProductFormData(formData);
  const parsedComponents = parseKitComponents(formData.get("components"));

  if (!parsed.success) {
    return { ok: false, message: "Corrija os campos destacados.", errors: parsed.error.flatten().fieldErrors };
  }

  if (!parsedComponents.success) {
    return { ok: false, message: parsedComponents.message };
  }

  const components = mergeComponents(parsedComponents.data);

  try {
    const componentCount = await prisma.product.count({
      where: { id: { in: components.map((component) => component.componentId) } },
    });

    if (componentCount !== components.length) {
      return { ok: false, message: "Um ou mais itens do kit não foram encontrados." };
    }

    await prisma.product.create({
      data: {
        sku: parsed.data.sku,
        name: parsed.data.name,
        isKit: true,
        quantity: parsed.data.quantity,
        soldQuantity: parsed.data.soldQuantity,
        manufacturingValue: new Prisma.Decimal(parsed.data.manufacturingValue),
        saleValue: new Prisma.Decimal(parsed.data.saleValue),
        photoUrl: parsed.data.photoUrl,
        kitComponents: {
          create: components,
        },
      },
    });

    revalidatePath("/stock");
    return { ok: true, message: "Kit cadastrado com sucesso." };
  } catch (error) {
    if (isDuplicateSkuError(error)) {
      return { ok: false, message: "Já existe um produto com este SKU.", errors: { sku: ["Este SKU já está em uso."] } };
    }

    return { ok: false, message: "Não foi possível cadastrar o kit." };
  }
}

export async function deleteProduct(_: ActionState, formData: FormData): Promise<ActionState> {
  const id = Number(formData.get("id"));

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Produto inválido." };
  }

  try {
    await prisma.product.delete({ where: { id } });
    revalidatePath("/stock");
    return { ok: true, message: "Produto excluído com sucesso." };
  } catch {
    return { ok: false, message: "Não foi possível excluir o produto." };
  }
}

export async function duplicateProduct(_: ActionState, formData: FormData): Promise<ActionState> {
  const id = Number(formData.get("id"));

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Produto inválido." };
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { kitComponents: true },
    });

    if (!product) {
      return { ok: false, message: "Produto não encontrado." };
    }

    await prisma.product.create({
      data: {
        sku: await createDuplicateSku(product.sku),
        name: `${product.name} (cópia)`,
        isKit: product.isKit,
        quantity: product.quantity,
        soldQuantity: product.soldQuantity,
        manufacturingValue: product.manufacturingValue,
        saleValue: product.saleValue,
        photoUrl: product.photoUrl,
        kitComponents: {
          create: product.kitComponents.map((component) => ({
            componentId: component.componentId,
            quantity: component.quantity,
          })),
        },
      },
    });

    revalidatePath("/stock");
    return { ok: true, message: "Produto duplicado com sucesso." };
  } catch {
    return { ok: false, message: "Não foi possível duplicar o produto." };
  }
}

export async function sellProduct(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseSellProductFormData(formData);

  if (!parsed.success) {
    return { ok: false, message: "Corrija os campos destacados.", errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const product = await prisma.product.findUnique({ where: { id: parsed.data.productId } });

    if (!product) {
      return { ok: false, message: "Produto não encontrado." };
    }

    const [allProducts, allComponents] = await Promise.all([
      prisma.product.findMany({ select: { id: true, quantity: true, name: true } }),
      prisma.productComponent.findMany({ select: { kitId: true, componentId: true, quantity: true } }),
    ]);
    const requiredQuantities = calculateRequiredQuantities(product.id, parsed.data.quantity, allComponents);
    const unavailableProduct = allProducts.find((item) => (requiredQuantities.get(item.id) ?? 0) > item.quantity);

    if (unavailableProduct) {
      return {
        ok: false,
        message: `Estoque insuficiente para ${unavailableProduct.name}.`,
        errors: { quantity: ["Quantidade maior que o estoque disponível."] },
      };
    }

    const grossValue = roundMoney(Number(product.saleValue) * parsed.data.quantity);
    const saleValueBeforeFee = calculateSaleValueBeforeFee(grossValue, parsed.data.discountType, parsed.data.discountValue, parsed.data.finalValue);
    const discountValue = roundMoney(Math.max(grossValue - saleValueBeforeFee, 0));
    const unitValueBeforeFee = roundMoney(saleValueBeforeFee / parsed.data.quantity);
    const platformFeeValue = parsed.data.platform === "SHOPEE" ? calculateShopeeFee(unitValueBeforeFee, parsed.data.quantity) : 0;
    const totalValue = roundMoney(Math.max(saleValueBeforeFee - platformFeeValue, 0));

    await prisma.$transaction([
      prisma.sale.create({
        data: {
          name: product.name,
          unitValue: new Prisma.Decimal(roundMoney(totalValue / parsed.data.quantity)),
          quantity: parsed.data.quantity,
          grossValue: new Prisma.Decimal(grossValue),
          discountValue: new Prisma.Decimal(discountValue),
          platformFeeValue: new Prisma.Decimal(platformFeeValue),
          totalValue: new Prisma.Decimal(totalValue),
          platform: parsed.data.platform,
          date: new Date(`${parsed.data.date}T00:00:00.000Z`),
          stockMovements: {
            create: Array.from(requiredQuantities.entries()).map(([productId, quantity]) => ({
              productId,
              quantity,
            })),
          },
        },
      }),
      ...Array.from(requiredQuantities.entries()).map(([productId, quantity]) =>
        prisma.product.update({
          where: { id: productId },
          data: {
            quantity: { decrement: quantity },
            soldQuantity: { increment: quantity },
          },
        })
      ),
    ]);

    revalidatePath("/");
    revalidatePath("/sales");
    revalidatePath("/stock");
    return { ok: true, message: "Venda lançada com sucesso." };
  } catch {
    return { ok: false, message: "Não foi possível lançar a venda." };
  }
}

function isDuplicateSkuError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function createDuplicateSku(sku: string) {
  const baseSku = `${sku.slice(0, 85)}-COPIA`;
  let candidate = baseSku;
  let suffix = 2;

  while (await prisma.product.findUnique({ where: { sku: candidate } })) {
    candidate = `${baseSku}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function mergeComponents(components: Array<{ componentId: number; quantity: number }>) {
  const grouped = new Map<number, number>();

  for (const component of components) {
    grouped.set(component.componentId, (grouped.get(component.componentId) ?? 0) + component.quantity);
  }

  return Array.from(grouped.entries()).map(([componentId, quantity]) => ({ componentId, quantity }));
}

function calculateRequiredQuantities(
  productId: number,
  quantity: number,
  components: Array<{ kitId: number; componentId: number; quantity: number }>
) {
  const required = new Map<number, number>();
  const componentsByKit = new Map<number, Array<{ componentId: number; quantity: number }>>();

  for (const component of components) {
    const kitComponents = componentsByKit.get(component.kitId) ?? [];
    kitComponents.push({ componentId: component.componentId, quantity: component.quantity });
    componentsByKit.set(component.kitId, kitComponents);
  }

  addRequiredProduct(productId, quantity, componentsByKit, required, new Set<number>());

  return required;
}

function addRequiredProduct(
  productId: number,
  quantity: number,
  componentsByKit: Map<number, Array<{ componentId: number; quantity: number }>>,
  required: Map<number, number>,
  visiting: Set<number>
) {
  if (visiting.has(productId)) {
    throw new Error("Composição circular de kit.");
  }

  required.set(productId, (required.get(productId) ?? 0) + quantity);

  const components = componentsByKit.get(productId) ?? [];

  if (components.length === 0) {
    return;
  }

  visiting.add(productId);

  for (const component of components) {
    addRequiredProduct(component.componentId, quantity * component.quantity, componentsByKit, required, visiting);
  }

  visiting.delete(productId);
}

function calculateSaleValueBeforeFee(
  grossValue: number,
  discountType: "NONE" | "FIXED" | "PERCENT",
  discountValue?: number | "",
  finalValue?: number | ""
) {
  if (typeof finalValue === "number") {
    return roundMoney(Math.max(finalValue, 0));
  }

  if (discountType === "FIXED" && typeof discountValue === "number") {
    return roundMoney(Math.max(grossValue - discountValue, 0));
  }

  if (discountType === "PERCENT" && typeof discountValue === "number") {
    const cappedPercent = Math.min(Math.max(discountValue, 0), 100);
    return roundMoney(Math.max(grossValue - grossValue * (cappedPercent / 100), 0));
  }

  return grossValue;
}
