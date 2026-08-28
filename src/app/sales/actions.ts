"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseFormData } from "@/lib/validation";
import type { ActionState } from "@/types/transaction";

export async function createSale(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseFormData(formData);

  if (!parsed.success) {
    return { ok: false, message: "Corrija os campos destacados.", errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const unitValue = new Prisma.Decimal(parsed.data.unitValue);

    await prisma.sale.create({
      data: {
        name: parsed.data.name,
        unitValue,
        quantity: parsed.data.quantity,
        grossValue: unitValue.mul(parsed.data.quantity),
        discountValue: new Prisma.Decimal(0),
        platformFeeValue: new Prisma.Decimal(0),
        totalValue: unitValue.mul(parsed.data.quantity),
        platform: "PERSONAL",
        date: new Date(`${parsed.data.date}T00:00:00.000Z`),
      },
    });

    revalidatePath("/");
    revalidatePath("/sales");
    return { ok: true, message: "Venda cadastrada com sucesso." };
  } catch {
    return { ok: false, message: "Não foi possível cadastrar a venda." };
  }
}

export async function updateSale(_: ActionState, formData: FormData): Promise<ActionState> {
  const id = Number(formData.get("id"));
  const parsed = parseFormData(formData);

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Registro inválido." };
  }

  if (!parsed.success) {
    return { ok: false, message: "Corrija os campos destacados.", errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const unitValue = new Prisma.Decimal(parsed.data.unitValue);

    await prisma.sale.update({
      where: { id },
      data: {
        name: parsed.data.name,
        unitValue,
        quantity: parsed.data.quantity,
        grossValue: unitValue.mul(parsed.data.quantity),
        discountValue: new Prisma.Decimal(0),
        platformFeeValue: new Prisma.Decimal(0),
        totalValue: unitValue.mul(parsed.data.quantity),
        platform: "PERSONAL",
        date: new Date(`${parsed.data.date}T00:00:00.000Z`),
      },
    });

    revalidatePath("/");
    revalidatePath("/sales");
    return { ok: true, message: "Venda atualizada com sucesso." };
  } catch {
    return { ok: false, message: "Não foi possível atualizar a venda." };
  }
}

export async function deleteSale(_: ActionState, formData: FormData): Promise<ActionState> {
  const id = Number(formData.get("id"));

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Registro inválido." };
  }

  try {
    const stockMovements = await prisma.saleStockMovement.findMany({
      where: { saleId: id },
      select: { productId: true, quantity: true },
    });

    await prisma.$transaction([
      ...stockMovements.map((movement) =>
        prisma.product.update({
          where: { id: movement.productId },
          data: {
            quantity: { increment: movement.quantity },
            soldQuantity: { decrement: movement.quantity },
          },
        })
      ),
      prisma.sale.delete({ where: { id } }),
    ]);

    revalidatePath("/");
    revalidatePath("/sales");
    revalidatePath("/stock");
    return { ok: true, message: "Venda excluída com sucesso." };
  } catch {
    return { ok: false, message: "Não foi possível excluir o registro." };
  }
}
