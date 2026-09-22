"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";

export type CalendarActionState = { error?: string } | undefined;

export async function updateCalendarSlot(slotId: string, content: string): Promise<CalendarActionState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_MARKETING")) {
    return { error: "No tenes permiso para editar el calendario." };
  }

  const slot = await prisma.contentCalendarSlot.findUnique({ where: { id: slotId } });
  if (!slot) return { error: "El casillero no existe." };

  await prisma.contentCalendarSlot.update({ where: { id: slotId }, data: { content } });
  revalidatePath("/calendar");
}
