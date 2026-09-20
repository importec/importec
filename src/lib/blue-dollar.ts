export type BlueDollarRate = {
  compra: number;
  venta: number;
  updatedAt: string;
};

export async function getBlueDollarRate(): Promise<BlueDollarRate | null> {
  try {
    const res = await fetch("https://dolarapi.com/v1/dolares/blue", {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.compra !== "number" || typeof data.venta !== "number") return null;
    return {
      compra: data.compra,
      venta: data.venta,
      updatedAt: typeof data.fechaActualizacion === "string" ? data.fechaActualizacion : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function arsToUsd(ars: number, rate: BlueDollarRate) {
  return ars / rate.venta;
}

export function usdToArsBlue(usd: number, rate: BlueDollarRate) {
  return usd * rate.venta;
}
