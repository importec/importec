export type CartItem = {
  kind: "unit" | "lot";
  id: string;
  title: string;
  subtitle: string;
  unitPrice: number;
  unitCost: number;
  quantity: number;
  maxQuantity: number;
};

export type PaymentRow = {
  method: "CASH" | "TRANSFER" | "CARD" | "TRADE_IN" | "OTHER";
  currency: "USD" | "ARS";
  amount: number;
  cashAccountId: string | null;
};

export type TradeInDraft = {
  category: string;
  brand: string;
  model: string;
  variant: string;
  storageGb: string;
  color: string;
  condition: string;
  batteryPct: string;
  imei: string;
  serialNumber: string;
  appraisedValue: string;
  locationId: string;
};
