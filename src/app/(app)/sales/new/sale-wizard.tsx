"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomerPicker, type PickedCustomer } from "@/components/customers/customer-picker";
import { ItemPicker } from "./item-picker";
import { formatCurrency } from "@/lib/format";
import { CATEGORY_LABELS, CONDITION_LABELS } from "@/lib/format";
import { ProductCategory, ConditionGrade } from "@/generated/prisma/enums";
import type { CartItem, PaymentRow, TradeInDraft } from "./types";

const CURRENCY_LABELS: Record<string, string> = { USD: "Dolares (USD)", ARS: "Pesos (ARS)" };
const METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CARD: "Tarjeta",
  TRADE_IN: "Plan canje",
  OTHER: "Otro",
};

function enumSelectValue<T extends string>(map: Record<string, string>) {
  return (value: T) => map[value] ?? value;
}

export function SaleWizard({
  cashAccounts,
  locations,
  usdToArs,
}: {
  cashAccounts: { id: string; name: string; currency: string }[];
  locations: { id: string; name: string }[];
  usdToArs: number | null;
}) {
  const router = useRouter();
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [currency, setCurrency] = useState<"USD" | "ARS">("USD");
  const [items, setItems] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [tradeInEnabled, setTradeInEnabled] = useState(false);
  const [tradeIn, setTradeIn] = useState<TradeInDraft>({
    category: ProductCategory.IPHONE,
    brand: "Apple",
    model: "",
    variant: "",
    storageGb: "",
    color: "",
    condition: ConditionGrade.GOOD,
    batteryPct: "",
    imei: "",
    serialNumber: "",
    appraisedValue: "",
    locationId: locations[0]?.id ?? "",
  });

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const total = Math.max(0, subtotal - discount);

  const paymentsTotalConverted = payments.reduce((sum, payment) => {
    if (payment.currency === currency) return sum + payment.amount;
    if (!usdToArs) return sum;
    const converted = payment.currency === "USD" ? payment.amount * usdToArs : payment.amount / usdToArs;
    return sum + converted;
  }, 0);

  const remaining = total - paymentsTotalConverted;

  const createSale = trpc.sales.create.useMutation({
    onSuccess: (sale) => {
      toast.success("Venta registrada");
      router.push(`/sales/${sale.id}`);
    },
    onError: (error) => toast.error(error.message),
  });

  function updateItemQuantity(index: number, quantity: number) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity: Math.min(Math.max(1, quantity), item.maxQuantity) } : item)),
    );
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function addPayment() {
    setPayments((prev) => [
      ...prev,
      { method: "CASH", currency, amount: Math.max(0, Number(remaining.toFixed(2))), cashAccountId: null },
    ]);
  }

  function updatePayment(index: number, patch: Partial<PaymentRow>) {
    setPayments((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function removePayment(index: number) {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  }

  const canSubmit = items.length > 0 && payments.length > 0 && remaining <= 0.01;

  function handleSubmit() {
    createSale.mutate({
      customerId: customer?.id,
      currency,
      discount,
      items: items.map((item) => ({
        kind: item.kind,
        id: item.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      payments: payments.map((p) => ({
        method: p.method,
        currency: p.currency,
        amount: p.amount,
        cashAccountId: p.cashAccountId ?? undefined,
      })),
      tradeIn:
        tradeInEnabled && tradeIn.model && tradeIn.appraisedValue
          ? {
              category: tradeIn.category as (typeof ProductCategory)[keyof typeof ProductCategory],
              brand: tradeIn.brand,
              model: tradeIn.model,
              variant: tradeIn.variant || undefined,
              storageGb: tradeIn.storageGb ? Number(tradeIn.storageGb) : undefined,
              color: tradeIn.color || undefined,
              condition: tradeIn.condition as (typeof ConditionGrade)[keyof typeof ConditionGrade],
              batteryPct: tradeIn.batteryPct ? Number(tradeIn.batteryPct) : undefined,
              imei: tradeIn.imei || undefined,
              serialNumber: tradeIn.serialNumber || undefined,
              appraisedValue: Number(tradeIn.appraisedValue),
              locationId: tradeIn.locationId,
            }
          : undefined,
    });
  }

  const cashAccountOptions = useMemo(
    () => (paymentCurrency: string) => cashAccounts.filter((a) => a.currency === paymentCurrency),
    [cashAccounts],
  );

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerPicker value={customer} onChange={setCustomer} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Equipos</CardTitle>
          <Select value={currency} onValueChange={(v) => v && setCurrency(v as "USD" | "ARS")}>
            <SelectTrigger className="w-40">
              <SelectValue>{(v: string) => enumSelectValue(CURRENCY_LABELS)(v as "USD" | "ARS")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">Dolares (USD)</SelectItem>
              <SelectItem value="ARS">Pesos (ARS)</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <ItemPicker onAdd={(item) => setItems((prev) => [...prev, item])} />
          {items.map((item, index) => (
            <div key={`${item.kind}-${item.id}-${index}`} className="flex flex-wrap items-center gap-3 rounded-md border p-3">
              <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.subtitle}</p>
              </div>
              {item.maxQuantity > 1 && (
                <Input
                  type="number"
                  min={1}
                  max={item.maxQuantity}
                  value={item.quantity}
                  onChange={(e) => updateItemQuantity(index, Number(e.target.value))}
                  className="w-16"
                />
              )}
              <Input
                type="number"
                step="0.01"
                value={item.unitPrice}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((it, i) => (i === index ? { ...it, unitPrice: Number(e.target.value) } : it)),
                  )
                }
                className="w-28"
              />
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeItem(index)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          {items.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Todavia no agregaste equipos.</p>
          )}

          <div className="flex items-center justify-end gap-4 border-t pt-3">
            <Label htmlFor="discount" className="text-sm text-muted-foreground">
              Descuento
            </Label>
            <Input
              id="discount"
              type="number"
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value) || 0)}
              className="w-28"
            />
          </div>
          <div className="flex justify-end text-sm">
            <div className="flex flex-col items-end gap-1">
              <span className="text-muted-foreground">Subtotal: {formatCurrency(subtotal, currency)}</span>
              <span className="text-base font-semibold">Total: {formatCurrency(total, currency)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Plan canje</CardTitle>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={tradeInEnabled}
              onChange={(e) => setTradeInEnabled(e.target.checked)}
              className="size-4"
            />
            El cliente entrega un equipo
          </label>
        </CardHeader>
        {tradeInEnabled && (
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Categoria</Label>
              <Select value={tradeIn.category} onValueChange={(v) => v && setTradeIn((t) => ({ ...t, category: v }))}>
                <SelectTrigger>
                  <SelectValue>{(v: string) => CATEGORY_LABELS[v] ?? v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ProductCategory).map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Marca</Label>
              <Input value={tradeIn.brand} onChange={(e) => setTradeIn((t) => ({ ...t, brand: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Modelo</Label>
              <Input
                value={tradeIn.model}
                placeholder="iPhone 12"
                onChange={(e) => setTradeIn((t) => ({ ...t, model: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Capacidad en GB</Label>
              <Input
                type="number"
                value={tradeIn.storageGb}
                onChange={(e) => setTradeIn((t) => ({ ...t, storageGb: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Color</Label>
              <Input value={tradeIn.color} onChange={(e) => setTradeIn((t) => ({ ...t, color: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Condicion</Label>
              <Select value={tradeIn.condition} onValueChange={(v) => v && setTradeIn((t) => ({ ...t, condition: v }))}>
                <SelectTrigger>
                  <SelectValue>{(v: string) => CONDITION_LABELS[v] ?? v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ConditionGrade).map((c) => (
                    <SelectItem key={c} value={c}>
                      {CONDITION_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Bateria (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={tradeIn.batteryPct}
                onChange={(e) => setTradeIn((t) => ({ ...t, batteryPct: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>IMEI</Label>
              <Input value={tradeIn.imei} onChange={(e) => setTradeIn((t) => ({ ...t, imei: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Ubicacion</Label>
              <Select value={tradeIn.locationId} onValueChange={(v) => v && setTradeIn((t) => ({ ...t, locationId: v }))}>
                <SelectTrigger>
                  <SelectValue>
                    {(v: string) => locations.find((l) => l.id === v)?.name ?? "Ubicacion"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label>Valor tomado ({currency})</Label>
              <Input
                type="number"
                step="0.01"
                value={tradeIn.appraisedValue}
                onChange={(e) => {
                  const value = e.target.value;
                  setTradeIn((t) => ({ ...t, appraisedValue: value }));
                  setPayments((prev) => {
                    const withoutTradeIn = prev.filter((p) => p.method !== "TRADE_IN");
                    const amount = Number(value) || 0;
                    if (amount <= 0) return withoutTradeIn;
                    return [...withoutTradeIn, { method: "TRADE_IN", currency, amount, cashAccountId: null }];
                  });
                }}
              />
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Medios de pago</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {payments.map((payment, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2 rounded-md border p-3">
              <Select
                value={payment.method}
                onValueChange={(v) => v && updatePayment(index, { method: v as PaymentRow["method"] })}
                disabled={payment.method === "TRADE_IN"}
              >
                <SelectTrigger className="w-36">
                  <SelectValue>{(v: string) => METHOD_LABELS[v] ?? v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(METHOD_LABELS)
                    .filter(([key]) => key !== "TRADE_IN")
                    .map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Select
                value={payment.currency}
                onValueChange={(v) => v && updatePayment(index, { currency: v as "USD" | "ARS", cashAccountId: null })}
                disabled={payment.method === "TRADE_IN"}
              >
                <SelectTrigger className="w-32">
                  <SelectValue>{(v: string) => CURRENCY_LABELS[v] ?? v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="ARS">ARS</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                step="0.01"
                value={payment.amount}
                disabled={payment.method === "TRADE_IN"}
                onChange={(e) => updatePayment(index, { amount: Number(e.target.value) || 0 })}
                className="w-28"
              />
              {payment.method !== "TRADE_IN" && (
                <Select
                  value={payment.cashAccountId ?? ""}
                  onValueChange={(v) => updatePayment(index, { cashAccountId: v || null })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue>
                      {(v: string) => cashAccounts.find((a) => a.id === v)?.name ?? "Cuenta de destino"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {cashAccountOptions(payment.currency).map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {payment.method !== "TRADE_IN" && (
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => removePayment(index)}>
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="self-start" onClick={addPayment}>
            <Plus className="size-4" />
            Agregar pago
          </Button>

          <div className="flex justify-end border-t pt-3 text-sm">
            {remaining > 0.01 ? (
              <span className="font-medium text-destructive">
                Falta cubrir {formatCurrency(remaining, currency)}
              </span>
            ) : (
              <span className="font-medium text-emerald-600 dark:text-emerald-400">Pago completo</span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" disabled={!canSubmit || createSale.isPending} onClick={handleSubmit}>
          {createSale.isPending ? "Registrando..." : "Confirmar venta"}
        </Button>
      </div>
    </div>
  );
}
