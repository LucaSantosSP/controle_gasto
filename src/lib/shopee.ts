export type SalePlatform = "PERSONAL" | "SHOPEE";

export function calculateShopeeFee(itemValue: number, quantity: number) {
  if (quantity <= 0 || itemValue <= 0) {
    return 0;
  }

  const commissionRate = itemValue <= 79.99 ? 0.2 : 0.14;
  const fixedFee = getShopeeFixedFee(itemValue);

  return roundMoney(itemValue * quantity * commissionRate + fixedFee * quantity);
}

export function getShopeeFixedFee(itemValue: number) {
  if (itemValue < 12) {
    return roundMoney(Math.min(4, itemValue * 0.5));
  }

  if (itemValue <= 79.99) {
    return 4;
  }

  if (itemValue <= 99.99) {
    return 16;
  }

  if (itemValue <= 199.99) {
    return 20;
  }

  return 26;
}

export function roundMoney(value: number) {
  const sign = value < 0 ? -1 : 1;
  const absoluteValue = Math.abs(value);
  const thousandths = Math.trunc((absoluteValue + Number.EPSILON) * 1000);
  const thirdDecimalDigit = thousandths % 10;
  const cents = Math.trunc(thousandths / 10) + (thirdDecimalDigit >= 5 ? 1 : 0);

  return sign * (cents / 100);
}
