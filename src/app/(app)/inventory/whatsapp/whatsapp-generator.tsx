"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORY_LABELS } from "@/lib/format";

type Item = {
  id: string;
  category: string;
  brand: string;
  model: string;
  variant: string | null;
  storageGb: number | null;
  color: string | null;
  batteryPct: number | null;
  isNew: boolean;
  listPrice: number;
  currency: "USD" | "ARS";
};

const CURRENCY_PREFIX: Record<string, string> = { USD: "USD", ARS: "$" };

const CATEGORY_EMOJI: Record<string, string> = {
  IPHONE: "📱",
  MAC: "💻",
  IPAD: "📱",
  WATCH: "⌚",
  AIRPODS: "🎧",
  ACCESSORY: "🔌",
  OTHER: "📦",
};

const DEFAULT_FOOTER = "🔄 Tomamos tu equipo en parte de pago\n🛠️ Equipos revisados y verificados";

function itemLine(item: Item, showBattery: boolean) {
  const name = [item.brand, item.model, item.variant, item.storageGb ? `${item.storageGb}GB` : null]
    .filter(Boolean)
    .join(" ");
  const battery = showBattery && item.batteryPct ? ` | 🔋 ${item.batteryPct}%` : item.isNew ? " | 🆕 Sellado" : "";
  return `${CATEGORY_EMOJI[item.category] ?? "📦"} ${name}${battery} — ${CURRENCY_PREFIX[item.currency]} ${item.listPrice.toFixed(0)}`;
}

export function WhatsappGenerator({ items }: { items: Item[] }) {
  const categoriesPresent = Array.from(new Set(items.map((i) => i.category)));
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set(categoriesPresent));
  const [showBattery, setShowBattery] = useState(true);
  const [footer, setFooter] = useState(DEFAULT_FOOTER);

  const text = useMemo(() => {
    const blocks: string[] = [];
    for (const category of categoriesPresent) {
      if (!selectedCategories.has(category)) continue;
      const categoryItems = items.filter((i) => i.category === category);
      if (categoryItems.length === 0) continue;
      const label = (CATEGORY_LABELS[category] ?? category).toUpperCase();
      blocks.push(
        [`🍎 STOCK ${label} DISPONIBLE`, ...categoryItems.map((item) => itemLine(item, showBattery))].join("\n"),
      );
    }
    if (footer.trim()) blocks.push(footer.trim());
    return blocks.join("\n\n");
  }, [items, categoriesPresent, selectedCategories, showBattery, footer]);

  function toggleCategory(category: string) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

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
          <div>
            <p className="mb-2 text-sm font-medium">Categorias a incluir</p>
            <div className="flex flex-wrap gap-3">
              {categoriesPresent.map((category) => (
                <label key={category} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedCategories.has(category)}
                    onChange={() => toggleCategory(category)}
                    className="size-4"
                  />
                  {CATEGORY_LABELS[category] ?? category}
                </label>
              ))}
              {categoriesPresent.length === 0 && (
                <p className="text-sm text-muted-foreground">No hay equipos disponibles para listar.</p>
              )}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showBattery}
              onChange={(e) => setShowBattery(e.target.checked)}
              className="size-4"
            />
            Mostrar porcentaje de bateria
          </label>
          <div>
            <p className="mb-2 text-sm font-medium">Texto final (editable)</p>
            <Textarea value={footer} onChange={(e) => setFooter(e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <Textarea value={text} readOnly rows={16} className="font-mono text-sm" />
          <div className="flex justify-end">
            <Button onClick={copyToClipboard} disabled={!text}>
              <Copy className="size-4" />
              Copiar al portapapeles
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
