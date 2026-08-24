export type TransactionKind = "sale" | "expense";

export type TransactionRow = {
  id: number;
  name: string;
  unitValue: string;
  quantity: number;
  grossValue?: string;
  discountValue?: string;
  platformFeeValue?: string;
  totalValue: string;
  platform?: string;
  date: string;
};

export type ActionState = {
  ok: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

export type ProductRow = {
  id: number;
  sku: string;
  name: string;
  quantity: number;
  manufacturingValue: string;
  saleValue: string;
  photoUrl: string;
};

export const initialActionState: ActionState = {
  ok: false,
  message: "",
};
