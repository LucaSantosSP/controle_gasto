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

export const initialActionState: ActionState = {
  ok: false,
  message: "",
};
