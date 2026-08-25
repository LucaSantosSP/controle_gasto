import { z } from "zod";

const moneyText = (fieldLabel: string) =>
  z
    .string({ error: `Informe ${fieldLabel}.` })
    .trim()
    .min(1, `Informe ${fieldLabel}.`)
    .transform(normalizeMoneyText)
    .pipe(
      z
        .string()
        .regex(/^\d+(\.\d{1,2})?$/, "Informe um valor monetário válido.")
    )
    .transform((value) => Number(value))
    .pipe(z.number().min(0, `${fieldLabel} deve ser maior ou igual a zero.`));

const decimalText = moneyText("o valor unitário");

export const productSchema = z.object({
  sku: z
    .string({ error: "Informe o SKU." })
    .trim()
    .min(1, "Informe o SKU.")
    .max(100, "O SKU deve ter no máximo 100 caracteres."),
  name: z.string().trim().min(1, "Informe o nome."),
  quantity: z.coerce
    .number({ error: "Informe a quantidade." })
    .int("A quantidade deve ser um número inteiro.")
    .min(0, "A quantidade deve ser maior ou igual a zero."),
  manufacturingValue: moneyText("o valor de fabricação"),
  saleValue: moneyText("o valor de venda"),
  photoUrl: z
    .string({ error: "Informe uma URL válida para a foto." })
    .trim()
    .refine((value) => value === "" || z.string().url().safeParse(value).success, {
      message: "Informe uma URL válida para a foto.",
    }),
});

export const sellProductSchema = z.object({
  productId: z.coerce.number({ error: "Produto inválido." }).int().positive("Produto inválido."),
  quantity: z.coerce
    .number({ error: "Informe a quantidade vendida." })
    .int("A quantidade vendida deve ser um número inteiro.")
    .positive("A quantidade vendida deve ser maior que zero."),
  platform: z.enum(["PERSONAL", "SHOPEE"], { error: "Informe a plataforma." }),
  discountType: z.enum(["NONE", "FIXED", "PERCENT"], { error: "Informe o tipo de desconto." }),
  discountValue: z.union([moneyText("o desconto"), z.literal("")]).optional(),
  finalValue: z.union([moneyText("o valor final"), z.literal("")]).optional(),
  date: z
    .string({ error: "Informe a data." })
    .trim()
    .min(1, "Informe a data.")
    .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), {
      message: "Informe uma data válida.",
    }),
});

export const transactionSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome."),
  unitValue: decimalText,
  quantity: z.coerce
    .number({ error: "Informe a quantidade." })
    .int("A quantidade deve ser um número inteiro.")
    .positive("A quantidade deve ser maior que zero."),
  date: z
    .string({ error: "Informe a data." })
    .trim()
    .min(1, "Informe a data.")
    .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), {
      message: "Informe uma data válida.",
    }),
});

export const periodSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type SellProductInput = z.infer<typeof sellProductSchema>;

export function parseFormData(formData: FormData) {
  return transactionSchema.safeParse({
    name: formData.get("name"),
    unitValue: formData.get("unitValue"),
    quantity: formData.get("quantity"),
    date: formData.get("date"),
  });
}

export function parseProductFormData(formData: FormData) {
  return productSchema.safeParse({
    sku: formData.get("sku"),
    name: formData.get("name"),
    quantity: formData.get("quantity"),
    manufacturingValue: formData.get("manufacturingValue"),
    saleValue: formData.get("saleValue"),
    photoUrl: formData.get("photoUrl"),
  });
}

export function parseSellProductFormData(formData: FormData) {
  return sellProductSchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
    platform: formData.get("platform"),
    discountType: formData.get("discountType"),
    discountValue: formData.get("discountValue") || "",
    finalValue: formData.get("finalValue") || "",
    date: formData.get("date"),
  });
}

export function parsePeriod(searchParams: Record<string, string | string[] | undefined>) {
  const parsed = periodSchema.parse({
    startDate: firstValue(searchParams.startDate),
    endDate: firstValue(searchParams.endDate),
  });

  return {
    startDate: parsed.startDate || undefined,
    endDate: parsed.endDate || undefined,
  };
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeMoneyText(value: string) {
  const trimmed = value.trim();

  if (trimmed.includes(",")) {
    return trimmed.replace(/\./g, "").replace(",", ".");
  }

  const parts = trimmed.split(".");

  if (parts.length > 1 && parts.at(-1)?.length === 3) {
    return parts.join("");
  }

  return trimmed;
}
