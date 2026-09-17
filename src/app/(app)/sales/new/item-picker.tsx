"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatUsd } from "@/lib/format";
import type { CartItem } from "./types";

export function ItemPicker({ onAdd }: { onAdd: (item: CartItem) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results, isFetching } = trpc.inventory.sellable.useQuery(
    { query: debounced },
    { enabled: debounced.trim().length > 0 },
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
          />
        }
      >
        <Search className="size-4" />
        Buscar equipo o accesorio para agregar...
      </PopoverTrigger>
      <PopoverContent className="w-96 max-w-[calc(100vw-2rem)] p-2" align="start">
        <Input
          autoFocus
          placeholder="ej. 15 Pro Max 256"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-2"
        />
        <div className="max-h-64 overflow-y-auto">
          {debounced.trim().length === 0 && (
            <p className="px-2 py-3 text-center text-sm text-muted-foreground">Escribi para buscar.</p>
          )}
          {debounced.trim().length > 0 && !isFetching && results?.length === 0 && (
            <p className="px-2 py-3 text-center text-sm text-muted-foreground">Sin resultados.</p>
          )}
          {results?.map((item) => (
            <button
              key={`${item.kind}-${item.id}`}
              type="button"
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
              onClick={() => {
                onAdd({
                  kind: item.kind,
                  id: item.id,
                  title: item.title,
                  subtitle: item.subtitle,
                  unitPrice: item.unitPrice,
                  unitCost: item.unitCost,
                  quantity: 1,
                  maxQuantity: item.maxQuantity,
                });
                setOpen(false);
                setQuery("");
              }}
            >
              <span className="flex flex-col">
                <span>{item.title}</span>
                <span className="text-xs text-muted-foreground">{item.subtitle}</span>
              </span>
              <span className="text-xs font-medium">{formatUsd(item.unitPrice)}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
