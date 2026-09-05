"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { roundMoney } from "@/lib/shopee";
import { parseShippingPackageFormData } from "@/lib/validation";
import type { ActionState } from "@/types/transaction";

export async function createShippingPackage(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseShippingPackageFormData(formData);

  if (!parsed.success) {
    return { ok: false, message: "Corrija os campos destacados.", errors: parsed.error.flatten().fieldErrors };
  }

  try {
    await prisma.shippingPackage.create({
      data: {
        name: parsed.data.name,
        quantity: parsed.data.quantity,
        totalValue: new Prisma.Decimal(parsed.data.totalValue),
        unitValue: new Prisma.Decimal(roundMoney(parsed.data.totalValue / parsed.data.quantity)),
      },
    });

    revalidatePath("/shipping-packages");
    revalidatePath("/sales");
    revalidatePath("/stock");
    return { ok: true, message: "Pacote cadastrado com sucesso." };
  } catch {
    return { ok: false, message: "Não foi possível cadastrar o pacote." };
  }
}

export async function updateShippingPackage(_: ActionState, formData: FormData): Promise<ActionState> {
  const id = Number(formData.get("id"));
  const parsed = parseShippingPackageFormData(formData);

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Pacote inválido." };
  }

  if (!parsed.success) {
    return { ok: false, message: "Corrija os campos destacados.", errors: parsed.error.flatten().fieldErrors };
  }

  try {
    await prisma.shippingPackage.update({
      where: { id },
      data: {
        name: parsed.data.name,
        quantity: parsed.data.quantity,
        totalValue: new Prisma.Decimal(parsed.data.totalValue),
        unitValue: new Prisma.Decimal(roundMoney(parsed.data.totalValue / parsed.data.quantity)),
      },
    });

    revalidatePath("/shipping-packages");
    revalidatePath("/sales");
    revalidatePath("/stock");
    return { ok: true, message: "Pacote atualizado com sucesso." };
  } catch {
    return { ok: false, message: "Não foi possível atualizar o pacote." };
  }
}

export async function deleteShippingPackage(_: ActionState, formData: FormData): Promise<ActionState> {
  const id = Number(formData.get("id"));

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Pacote inválido." };
  }

  try {
    await prisma.shippingPackage.delete({ where: { id } });

    revalidatePath("/shipping-packages");
    revalidatePath("/sales");
    revalidatePath("/stock");
    return { ok: true, message: "Pacote excluído com sucesso." };
  } catch {
    return { ok: false, message: "Não foi possível excluir o pacote." };
  }
}
