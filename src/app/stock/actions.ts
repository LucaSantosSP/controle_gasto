"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseProductFormData } from "@/lib/validation";
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
    await prisma.product.update({
      where: { id },
      data: {
        sku: parsed.data.sku,
        name: parsed.data.name,
        quantity: parsed.data.quantity,
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
