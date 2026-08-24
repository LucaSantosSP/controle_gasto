"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseFormData } from "@/lib/validation";
import type { ActionState } from "@/types/transaction";

export async function createExpense(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseFormData(formData);

  if (!parsed.success) {
    return { ok: false, message: "Corrija os campos destacados.", errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const unitValue = new Prisma.Decimal(parsed.data.unitValue);

    await prisma.expense.create({
      data: {
        name: parsed.data.name,
        unitValue,
        quantity: parsed.data.quantity,
        totalValue: unitValue.mul(parsed.data.quantity),
        date: new Date(`${parsed.data.date}T00:00:00.000Z`),
      },
    });

    revalidatePath("/");
    revalidatePath("/expenses");
    return { ok: true, message: "Gasto cadastrado com sucesso." };
  } catch {
    return { ok: false, message: "Não foi possível cadastrar o gasto." };
  }
}

export async function updateExpense(_: ActionState, formData: FormData): Promise<ActionState> {
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

    await prisma.expense.update({
      where: { id },
      data: {
        name: parsed.data.name,
        unitValue,
        quantity: parsed.data.quantity,
        totalValue: unitValue.mul(parsed.data.quantity),
        date: new Date(`${parsed.data.date}T00:00:00.000Z`),
      },
    });

    revalidatePath("/");
    revalidatePath("/expenses");
    return { ok: true, message: "Gasto atualizado com sucesso." };
  } catch {
    return { ok: false, message: "Não foi possível atualizar o gasto." };
  }
}

export async function deleteExpense(_: ActionState, formData: FormData): Promise<ActionState> {
  const id = Number(formData.get("id"));

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Registro inválido." };
  }

  try {
    await prisma.expense.delete({ where: { id } });
    revalidatePath("/");
    revalidatePath("/expenses");
    return { ok: true, message: "Gasto excluído com sucesso." };
  } catch {
    return { ok: false, message: "Não foi possível excluir o registro." };
  }
}
