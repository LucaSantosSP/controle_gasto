"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { calculateShopeeFee, roundMoney } from "@/lib/shopee";
import { parseProductFormData, parseSellProductFormData } from "@/lib/validation";
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
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      return { ok: false, message: "Produto não encontrado." };
    }

    await prisma.product.create({
      data: {
        sku: await createDuplicateSku(product.sku),
        name: `${product.name} (cópia)`,
        quantity: product.quantity,
        soldQuantity: product.soldQuantity,
        manufacturingValue: product.manufacturingValue,
        saleValue: product.saleValue,
        photoUrl: product.photoUrl,
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

    if (parsed.data.quantity > product.quantity) {
      return {
        ok: false,
        message: "Quantidade vendida maior que o estoque disponível.",
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
        },
      }),
      prisma.product.update({
        where: { id: product.id },
        data: {
          quantity: { decrement: parsed.data.quantity },
          soldQuantity: { increment: parsed.data.quantity },
        },
      }),
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
