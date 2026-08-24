export function formatCurrency(value: number | string) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function toInputDate(date: Date | string) {
  return new Date(date).toISOString().slice(0, 10);
}

export function toMoneyInput(value: number | string) {
  return Number(value).toFixed(2).replace(".", ",");
}
