import { z } from "zod";

const decimalText = z
  .string({ error: "Informe o valor unitário." })
  .trim()
  .min(1, "Informe o valor unitário.")
  .transform((value) => value.replace(/\./g, "").replace(",", "."))
  .pipe(
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Informe um valor monetário válido.")
  )
  .transform((value) => Number(value))
  .pipe(z.number().min(0, "O valor unitário deve ser maior ou igual a zero."));

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

export function parseFormData(formData: FormData) {
  return transactionSchema.safeParse({
    name: formData.get("name"),
    unitValue: formData.get("unitValue"),
    quantity: formData.get("quantity"),
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
