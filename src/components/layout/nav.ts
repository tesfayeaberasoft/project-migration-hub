import {
  BadgeCheck,
  BarChart3,
  Banknote,
  ClipboardList,
  CreditCard,
  DatabaseBackup,
  FileClock,
  FileText,
  Gauge,
  Hourglass,
  KeyRound,
  Landmark,
  LayoutDashboard,
  ListChecks,
  PlusCircle,
  Receipt,
  ScrollText,
  Search,
  Settings,
  ShieldAlert,
  Tags,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { LinkProps } from "@tanstack/react-router";
import type { Role } from "@/types";

export interface NavItem {
  to: NonNullable<LinkProps["to"]>;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: Record<Role, NavGroup[]> = {
  admin: [
    { label: "Overview", items: [{ to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true }] },
    {
      label: "Accounts",
      items: [
        { to: "/admin/users", label: "User Management", icon: UserCog },
        { to: "/admin/guests", label: "Guest Accounts", icon: Users },
      ],
    },
    {
      label: "System",
      items: [
        { to: "/admin/services", label: "Service Catalog", icon: Tags },
        { to: "/admin/settings", label: "System Settings", icon: Settings },
        { to: "/admin/audit", label: "Audit Logs", icon: ScrollText },
        { to: "/admin/backup", label: "Backup & Restore", icon: DatabaseBackup },
      ],
    },
  ],
  cashier: [
    { label: "Overview", items: [{ to: "/cashier", label: "Dashboard", icon: LayoutDashboard, exact: true }] },
    {
      label: "Credit desk",
      items: [
        { to: "/cashier/guests", label: "Guest Search", icon: Search },
        { to: "/cashier/new", label: "New Transaction", icon: PlusCircle },
        { to: "/cashier/pending", label: "Pending & Disputes", icon: Hourglass },
        { to: "/cashier/history", label: "Transaction History", icon: ClipboardList },
      ],
    },
  ],
  finance: [
    { label: "Overview", items: [{ to: "/finance", label: "Dashboard", icon: Gauge, exact: true }] },
    {
      label: "Approvals",
      items: [
        { to: "/finance/approvals", label: "Transaction Approvals", icon: ListChecks },
        { to: "/finance/exceptions", label: "Exceptional Credit", icon: ShieldAlert },
        { to: "/finance/prices", label: "Price Requests", icon: Tags },
      ],
    },
    {
      label: "Accounts",
      items: [
        { to: "/finance/guests", label: "Guest Finances", icon: Users },
        { to: "/finance/limits", label: "Credit Limits", icon: KeyRound },
        { to: "/finance/historical", label: "Historical Debt", icon: Landmark },
      ],
    },
    {
      label: "Payments & reports",
      items: [
        { to: "/finance/payments", label: "Record Payment", icon: Banknote },
        { to: "/finance/payment-history", label: "Payment History", icon: Receipt },
        { to: "/finance/reports", label: "Financial Reports", icon: BarChart3 },
      ],
    },
  ],
  guest: [
    { label: "My account", items: [{ to: "/guest", label: "Dashboard", icon: LayoutDashboard, exact: true }] },
    {
      label: "Transactions",
      items: [
        { to: "/guest/pending", label: "Pending Confirmation", icon: BadgeCheck },
        { to: "/guest/history", label: "Transaction History", icon: FileClock },
      ],
    },
    {
      label: "Debt & payments",
      items: [
        { to: "/guest/debt", label: "Debt Details", icon: Wallet },
        { to: "/guest/payments", label: "Payment History", icon: CreditCard },
        { to: "/guest/receipts", label: "Receipts", icon: FileText },
      ],
    },
  ],
};
