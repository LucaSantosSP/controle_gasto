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
  isKit: boolean;
  quantity: number;
  minimumStock: number;
  soldQuantity: number;
  manufacturingValue: string;
  saleValue: string;
  photoUrl: string;
  variations: ProductVariationRow[];
  components: ProductComponentRow[];
};

export type ProductVariationRow = {
  id: number;
  sku: string;
  name: string;
  variationType: string;
  variationValue: string;
  quantity: number;
  minimumStock: number;
  soldQuantity: number;
  manufacturingValue: string;
  saleValue: string;
};

export type ProductComponentRow = {
  componentId: number;
  variationId: number | null;
  sku: string;
  name: string;
  quantity: number;
  isKit: boolean;
  photoUrl: string;
};

export const initialActionState: ActionState = {
  ok: false,
  message: "",
};
