import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EditableText } from "@/components/inventory/editable-text";
import { updateCalendarSlot } from "./actions";

const DAYS = [
  { dayOfWeek: 1, label: "Lunes" },
  { dayOfWeek: 2, label: "Martes" },
  { dayOfWeek: 3, label: "Miercoles" },
  { dayOfWeek: 4, label: "Jueves" },
  { dayOfWeek: 5, label: "Viernes" },
  { dayOfWeek: 6, label: "Sabado" },
] as const;

export default async function CalendarPage() {
  const session = await requireSession();
  const canManage = can(session.role, "MANAGE_MARKETING");

  const slots = await prisma.contentCalendarSlot.findMany();
  const byKey = new Map(slots.map((s) => [`${s.dayOfWeek}-${s.timeSlot}`, s]));

  function cell(dayOfWeek: number, timeSlot: "MORNING" | "MIDDAY") {
    const slot = byKey.get(`${dayOfWeek}-${timeSlot}`);
    if (!slot) return <span className="text-sm text-muted-foreground">—</span>;
    if (!canManage) {
      return <p className="whitespace-pre-line text-sm">{slot.content || "—"}</p>;
    }
    return (
      <EditableText
        value={slot.content}
        onSave={updateCalendarSlot.bind(null, slot.id)}
        emptyLabel="Sin definir"
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Calendario de contenido</h1>
        <p className="text-sm text-muted-foreground">
          Que catalogo mandar cada dia, para el community manager. Tocá un casillero para editarlo.
        </p>
      </div>

      {/* Mobile: tarjetas */}
      <div className="flex flex-col gap-3 md:hidden">
        {DAYS.map((day) => (
          <Card key={day.dayOfWeek}>
            <CardContent className="flex flex-col gap-3 pt-6">
              <p className="font-medium">{day.label}</p>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Manana</p>
                {cell(day.dayOfWeek, "MORNING")}
              </div>
              <div className="border-t pt-3">
                <p className="mb-1 text-xs text-muted-foreground">Mediodia o tarde</p>
                {cell(day.dayOfWeek, "MIDDAY")}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop: tabla */}
      <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Dia</TableHead>
              <TableHead>Manana</TableHead>
              <TableHead>Mediodia o tarde</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {DAYS.map((day) => (
              <TableRow key={day.dayOfWeek}>
                <TableCell className="font-medium">{day.label}</TableCell>
                <TableCell>{cell(day.dayOfWeek, "MORNING")}</TableCell>
                <TableCell>{cell(day.dayOfWeek, "MIDDAY")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
