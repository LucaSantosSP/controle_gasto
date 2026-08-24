export type TransactionKind = "sale" | "expense";

export type TransactionRow = {
  id: number;
  name: string;
  unitValue: string;
  quantity: number;
  totalValue: string;
  date: string;
};

export type ActionState = {
  ok: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

export type ProductRow = {
  id: number;
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
