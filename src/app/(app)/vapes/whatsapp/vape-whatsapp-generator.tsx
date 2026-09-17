"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type Item = {
  id: string;
  name: string;
  flavor: string | null;
  stockQuantity: number;
  salePrice: number;
  currency: "USD" | "ARS";
};

const DEFAULT_HEADER = "💨 STOCK VAPES DISPONIBLE";
const DEFAULT_FOOTER = "📦 Entrega inmediata\n📲 Consultanos por mayor";
const CURRENCY_PREFIX: Record<string, string> = { USD: "USD", ARS: "$" };

export function VapeWhatsappGenerator({ items }: { items: Item[] }) {
  const [showStock, setShowStock] = useState(true);
  const [header, setHeader] = useState(DEFAULT_HEADER);
  const [footer, setFooter] = useState(DEFAULT_FOOTER);

  const text = useMemo(() => {
    const lines = items.map((item) => {
      const name = [item.name, item.flavor].filter(Boolean).join(" - ");
      const stock = showStock ? ` (x${item.stockQuantity})` : "";
      return `💨 ${name}${stock} — ${CURRENCY_PREFIX[item.currency]} ${item.salePrice.toFixed(0)}`;
    });
    return [header.trim(), ...lines, footer.trim()].filter(Boolean).join("\n\n").replace(/\n\n(?=💨)/g, "\n");
  }, [items, showStock, header, footer]);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copiado al portapapeles");
    } catch {
      toast.error("No se pudo copiar. Selecciona el texto manualmente.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showStock}
              onChange={(e) => setShowStock(e.target.checked)}
              className="size-4"
            />
            Mostrar cantidad disponible
          </label>
          <div>
            <p className="mb-2 text-sm font-medium">Encabezado</p>
            <Textarea value={header} onChange={(e) => setHeader(e.target.value)} rows={1} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Texto final</p>
            <Textarea value={footer} onChange={(e) => setFooter(e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <Textarea value={text} readOnly rows={14} className="font-mono text-sm" />
          <div className="flex justify-end">
            <Button onClick={copyToClipboard} disabled={!text || items.length === 0}>
              <Copy className="size-4" />
              Copiar al portapapeles
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
