import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Wrench,
  Repeat,
  HandCoins,
  Wallet,
  Truck,
  Receipt,
  BarChart3,
  ShieldCheck,
  Cigarette,
  Users2,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Modulo todavia no construido: se muestra en el menu (asi se ve el mapa
   * completo del sistema) pero deshabilitado, nunca como un link que no lleva
   * a ningun lado. */
  comingSoon?: boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operacion",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Inventario", href: "/inventory", icon: Package },
      { label: "Ventas", href: "/sales", icon: ShoppingCart },
      { label: "Clientes", href: "/customers", icon: Users },
    ],
  },
  {
    label: "Vapes",
    items: [
      { label: "Stock", href: "/vapes", icon: Cigarette },
      { label: "Vendedores", href: "/vapes/sellers", icon: Users2 },
    ],
  },
  {
    label: "Servicios",
    items: [
      { label: "Servicio tecnico", href: "/repairs", icon: Wrench },
      { label: "Plan canje", href: "/trade-ins", icon: Repeat },
      { label: "Consignacion", href: "/consignments", icon: HandCoins },
    ],
  },
  {
    label: "Gestion",
    items: [
      { label: "Caja y finanzas", href: "/finance", icon: Wallet },
      { label: "Proveedores", href: "/suppliers", icon: Truck },
      { label: "Gastos", href: "/expenses", icon: Receipt },
      { label: "Reportes", href: "/reports", icon: BarChart3 },
      { label: "Usuarios", href: "/users", icon: ShieldCheck },
    ],
  },
];
