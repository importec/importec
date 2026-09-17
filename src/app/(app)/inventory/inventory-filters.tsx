"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/format";
import { ProductCategory, InventoryUnitStatus, OwnerType } from "@/generated/prisma/enums";

const ALL = "ALL";

const CATEGORY_SELECT_LABELS: Record<string, string> = {
  [ALL]: "Todas las categorias",
  ...CATEGORY_LABELS,
};
const STATUS_SELECT_LABELS: Record<string, string> = {
  [ALL]: "Todos los estados",
  ...STATUS_LABELS,
};
const OWNER_SELECT_LABELS: Record<string, string> = {
  [ALL]: "Propio y consignado",
  [OwnerType.COMPANY]: "Solo propio",
  [OwnerType.CONSIGNMENT]: "Solo consignado",
};

export function InventoryFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    const timer = setTimeout(() => {
      updateParam("q", q);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === ALL) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    startTransition(() => {
      router.push(`/inventory?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Input
        placeholder="Buscar por modelo, IMEI, serie..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="sm:max-w-xs"
      />
      <Select
        defaultValue={searchParams.get("category") ?? ALL}
        onValueChange={(value) => updateParam("category", value)}
      >
        <SelectTrigger className="sm:w-40">
          <SelectValue>{(value: string) => CATEGORY_SELECT_LABELS[value] ?? "Categoria"}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas las categorias</SelectItem>
          {Object.values(ProductCategory).map((category) => (
            <SelectItem key={category} value={category}>
              {CATEGORY_LABELS[category]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        defaultValue={searchParams.get("status") ?? ALL}
        onValueChange={(value) => updateParam("status", value)}
      >
        <SelectTrigger className="sm:w-40">
          <SelectValue>{(value: string) => STATUS_SELECT_LABELS[value] ?? "Estado"}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos los estados</SelectItem>
          {Object.values(InventoryUnitStatus).map((status) => (
            <SelectItem key={status} value={status}>
              {STATUS_LABELS[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        defaultValue={searchParams.get("owner") ?? ALL}
        onValueChange={(value) => updateParam("owner", value)}
      >
        <SelectTrigger className="sm:w-40">
          <SelectValue>{(value: string) => OWNER_SELECT_LABELS[value] ?? "Propiedad"}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Propio y consignado</SelectItem>
          <SelectItem value={OwnerType.COMPANY}>Solo propio</SelectItem>
          <SelectItem value={OwnerType.CONSIGNMENT}>Solo consignado</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
