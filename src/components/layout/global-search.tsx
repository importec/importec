"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { trpc } from "@/lib/trpc/client";

const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: "Disponible",
  RESERVED: "Reservado",
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 200);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const { data: results, isFetching } = trpc.inventory.search.useQuery(
    { query: debounced },
    { enabled: debounced.trim().length > 0 },
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buscar equipos"
        className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-accent sm:w-full sm:max-w-sm sm:justify-start sm:gap-2 sm:px-3 sm:py-1.5"
      >
        <Search className="size-4 shrink-0" />
        <span className="hidden flex-1 truncate text-left text-sm sm:inline">
          Buscar equipos... (ej. 15 Pro Max 256)
        </span>
        <kbd className="hidden shrink-0 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:inline-block">
          ⌘K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
        <CommandInput
          placeholder="Buscar por modelo, capacidad, color, IMEI..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {query.trim().length === 0 && (
            <CommandEmpty>Escribi para buscar en el inventario.</CommandEmpty>
          )}
          {query.trim().length > 0 && !isFetching && results?.length === 0 && (
            <CommandEmpty>No se encontraron equipos.</CommandEmpty>
          )}
          {results && results.length > 0 && (
            <CommandGroup heading="Inventario">
              {results.map((unit) => (
                <CommandItem
                  key={unit.id}
                  value={unit.id}
                  onSelect={() => {
                    router.push(`/inventory/${unit.id}`);
                    setTimeout(() => setOpen(false), 0);
                  }}
                  className="flex flex-col items-start gap-0.5"
                >
                  <span className="flex w-full items-center justify-between">
                    <span className="font-medium">{unit.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {STATUS_LABEL[unit.status] ?? unit.status}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">{unit.subtitle}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
