"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarCheck,
  Contact,
  CreditCard,
  FileArchive,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Plane,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  Ticket,
  Users,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { cn, initials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { canAccess } from "@/lib/permissions";
import type { UserRole } from "@/generated/prisma/enums";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, module: "dashboard" },
  { href: "/customers", label: "Customers", icon: Contact, module: "customers" },
  { href: "/leads", label: "Leads", icon: CalendarCheck, module: "leads" },
  { href: "/bookings/flights", label: "Flights", icon: Plane, module: "bookings" },
  { href: "/visa", label: "Visa", icon: ShieldCheck, module: "visa" },
  { href: "/packages", label: "Packages", icon: BriefcaseBusiness, module: "packages" },
  { href: "/quotations", label: "Quotations", icon: FileText, module: "quotations" },
  { href: "/invoices", label: "Invoices", icon: Receipt, module: "invoices" },
  { href: "/payments", label: "Payments", icon: CreditCard, module: "payments" },
  { href: "/agents", label: "B2B Agents", icon: Users, module: "agents" },
  { href: "/wallet", label: "Wallet", icon: Wallet, module: "wallet" },
  { href: "/suppliers", label: "Suppliers", icon: Ticket, module: "suppliers" },
  { href: "/documents", label: "Documents", icon: FileArchive, module: "documents" },
  { href: "/reports", label: "Reports", icon: BarChart3, module: "reports" },
  { href: "/staff", label: "Staff", icon: Users, module: "staff" },
  { href: "/settings", label: "Settings", icon: Settings, module: "settings" },
  { href: "/agent-portal", label: "Agent Portal", icon: BriefcaseBusiness, module: "agent-portal" },
  { href: "/customer-portal", label: "Customer Portal", icon: Contact, module: "customer-portal" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data } = useSession();
  const role = data?.user?.role as UserRole | undefined;
  const visibleNav = nav.filter((item) => canAccess(role, item.module));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white transition-transform dark:border-slate-800 dark:bg-slate-950 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5 dark:border-slate-800">
          <div className="grid size-9 place-items-center rounded-md bg-slate-950 text-sm font-bold text-white dark:bg-white dark:text-slate-950">TO</div>
          <div>
            <p className="text-sm font-semibold">TravelOS CRM</p>
            <p className="text-xs text-slate-500">{data?.user?.agencyName ?? "Travel agency suite"}</p>
          </div>
        </div>
        <nav className="h-[calc(100vh-8rem)] overflow-y-auto p-3">
          {visibleNav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100",
                  active && "bg-slate-950 text-white hover:bg-slate-950 hover:text-white dark:bg-white dark:text-slate-950",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-full bg-slate-100 text-xs font-semibold dark:bg-slate-900">{initials(data?.user?.name)}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{data?.user?.name ?? "Demo user"}</p>
              <p className="truncate text-xs text-slate-500">{data?.user?.role ?? "Staff"}</p>
            </div>
            <button aria-label="Sign out" onClick={() => signOut({ callbackUrl: "/login" })} className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-900">
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {open ? <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden" onClick={() => setOpen(false)} /> : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 sm:px-6">
          <button className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-900 lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu className="size-5" />
          </button>
          <div className="relative max-w-xl flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:focus:border-slate-600"
              placeholder="Search customers, bookings, invoices..."
            />
          </div>
          <Button variant="secondary" className="hidden sm:inline-flex">
            <Bell className="size-4" />
            Alerts
          </Button>
        </header>
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
