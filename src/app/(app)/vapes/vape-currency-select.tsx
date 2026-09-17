"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateVapeProductCurrency } from "./actions";

const CURRENCY_LABELS: Record<string, string> = { USD: "USD", ARS: "ARS" };

export function VapeCurrencySelect({ productId, currency }: { productId: string; currency: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleChange(value: string | null) {
    if (!value || value === currency) return;
    startTransition(async () => {
      const result = await updateVapeProductCurrency(productId, value);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Moneda actualizada");
        router.refresh();
      }
    });
  }

  return (
    <Select value={currency} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger size="sm" className="w-[4.5rem] px-1.5 text-xs">
        <SelectValue>{(value: string) => CURRENCY_LABELS[value] ?? value}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ARS">ARS</SelectItem>
        <SelectItem value="USD">USD</SelectItem>
      </SelectContent>
    </Select>
  );
}
