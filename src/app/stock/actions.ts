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
        name: parsed.data.name,
        quantity: parsed.data.quantity,
        manufacturingValue: new Prisma.Decimal(parsed.data.manufacturingValue),
        saleValue: new Prisma.Decimal(parsed.data.saleValue),
        photoUrl: parsed.data.photoUrl,
      },
    });

    revalidatePath("/stock");
    return { ok: true, message: "Produto cadastrado com sucesso." };
  } catch {
    return { ok: false, message: "Não foi possível cadastrar o produto." };
  }
}
