import type { UserRole } from "@/generated/prisma/enums";

/**
 * Matriz de capacidades por rol. Deliberadamente simple (constantes en codigo,
 * no una tabla Permission editable desde la UI): con 5 roles fijos, una tabla
 * de permisos dinamica seria complejidad sin beneficio real en esta etapa.
 * Si el negocio pide roles configurables mas adelante, esto se migra a datos.
 */
export const CAPABILITIES = {
  VIEW_COSTS: ["ADMIN", "SUPERVISOR"],
  VIEW_MARGINS: ["ADMIN", "SUPERVISOR"],
  VIEW_CASH: ["ADMIN", "SUPERVISOR", "CASHIER"],
  MANAGE_INVENTORY: ["ADMIN", "SUPERVISOR", "SALES"],
  MANAGE_VAPES: ["ADMIN", "SUPERVISOR", "SALES"],
  MANAGE_SALES: ["ADMIN", "SUPERVISOR", "SALES", "CASHIER"],
  MANAGE_CUSTOMERS: ["ADMIN", "SUPERVISOR", "SALES", "CASHIER"],
  MANAGE_CONSIGNMENTS: ["ADMIN", "SUPERVISOR", "SALES"],
  MANAGE_REPAIRS: ["ADMIN", "SUPERVISOR", "TECH"],
  MANAGE_FINANCE: ["ADMIN", "SUPERVISOR", "CASHIER"],
  MANAGE_SUPPLIERS: ["ADMIN", "SUPERVISOR"],
  MANAGE_USERS: ["ADMIN"],
} as const satisfies Record<string, readonly UserRole[]>;

export type Capability = keyof typeof CAPABILITIES;

export function can(role: UserRole, capability: Capability): boolean {
  return (CAPABILITIES[capability] as readonly UserRole[]).includes(role);
}

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrador",
  SALES: "Ventas",
  TECH: "Servicio tecnico",
  CASHIER: "Caja",
  SUPERVISOR: "Supervisor",
};
