export function productTitle(product: {
  brand: string;
  model: string;
  variant?: string | null;
  storageGb?: number | null;
}) {
  const modelStartsWithBrand = product.model
    .toLowerCase()
    .startsWith(product.brand.toLowerCase());

  return [
    modelStartsWithBrand ? null : product.brand,
    product.model,
    product.variant,
    product.storageGb ? `${product.storageGb}GB` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

export function customerName(customer: { firstName: string; lastName: string }) {
  return `${customer.firstName} ${customer.lastName}`.trim();
}

export function formatCurrency(value: number, currency: "USD" | "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "ARS" ? 0 : 2,
  }).format(value);
}

export function formatUsd(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("es-AR").format(value);
}

export const CATEGORY_LABELS: Record<string, string> = {
  IPHONE: "iPhone",
  MAC: "Mac",
  IPAD: "iPad",
  WATCH: "Apple Watch",
  AIRPODS: "AirPods",
  ACCESSORY: "Accesorios",
  OTHER: "Otros",
};

export const CONDITION_LABELS: Record<string, string> = {
  NEW: "Nuevo",
  LIKE_NEW: "Como nuevo",
  GOOD: "Bueno",
  FAIR: "Regular",
  POOR: "Para repuestos",
};

export const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Disponible",
  RESERVED: "Reservado",
  SOLD: "Vendido",
  IN_REVIEW: "En revision",
  IN_REPAIR: "Servicio tecnico",
  RETURNED: "Devuelto",
  DISPOSED: "Dado de baja",
};
