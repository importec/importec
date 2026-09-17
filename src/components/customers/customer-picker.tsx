"use client";

import { useEffect, useState } from "react";
import { Search, UserPlus, X } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type PickedCustomer = { id: string; name: string; phone: string | null };

export function CustomerPicker({
  value,
  onChange,
}: {
  value: PickedCustomer | null;
  onChange: (customer: PickedCustomer | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [quickCreate, setQuickCreate] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results } = trpc.customers.search.useQuery({ query: debounced }, { enabled: open });
  const utils = trpc.useUtils();
  const quickCreateMutation = trpc.customers.quickCreate.useMutation({
    onSuccess: (customer) => {
      onChange(customer);
      setOpen(false);
      setQuickCreate(false);
      setFirstName("");
      setLastName("");
      setPhone("");
      utils.customers.search.invalidate();
    },
  });

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
        <span className="flex-1">
          {value.name}
          {value.phone && <span className="text-muted-foreground"> · {value.phone}</span>}
        </span>
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(null)}>
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuickCreate(false);
      }}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
          />
        }
      >
        <Search className="size-4" />
        Elegi un cliente o crea uno nuevo
      </PopoverTrigger>
      <PopoverContent className="w-80 max-w-[calc(100vw-2rem)] p-2" align="start">
        {quickCreate ? (
          <div className="flex flex-col gap-2">
            <Input placeholder="Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <Input placeholder="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            <Input placeholder="Telefono (opcional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setQuickCreate(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!firstName || !lastName || quickCreateMutation.isPending}
                onClick={() =>
                  quickCreateMutation.mutate({ firstName, lastName, phone: phone || undefined })
                }
              >
                Crear
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Input
              autoFocus
              placeholder="Buscar cliente..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mb-2"
            />
            <div className="max-h-56 overflow-y-auto">
              {results?.length === 0 && (
                <p className="px-2 py-3 text-center text-sm text-muted-foreground">Sin resultados.</p>
              )}
              {results?.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  className="flex w-full flex-col items-start rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                  onClick={() => {
                    onChange(customer);
                    setOpen(false);
                  }}
                >
                  <span>{customer.name}</span>
                  {customer.phone && <span className="text-xs text-muted-foreground">{customer.phone}</span>}
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1 w-full justify-start"
              onClick={() => setQuickCreate(true)}
            >
              <UserPlus className="size-4" />
              Crear cliente nuevo
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
