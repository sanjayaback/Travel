import type { UserRole } from "@/generated/prisma/enums";

export const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  AGENCY_ADMIN: "Agency Admin",
  MANAGER: "Manager",
  TICKETING_STAFF: "Ticketing Staff",
  VISA_OFFICER: "Visa Officer",
  SALES_STAFF: "Sales Staff",
  ACCOUNTANT: "Accountant",
  B2B_AGENT: "B2B Agent",
  CUSTOMER: "Customer",
};

export const roleAccess: Record<UserRole, string[]> = {
  SUPER_ADMIN: ["*"],
  AGENCY_ADMIN: ["*"],
  MANAGER: ["dashboard", "customers", "leads", "bookings", "visa", "packages", "quotations", "reports", "staff", "documents"],
  TICKETING_STAFF: ["dashboard", "customers", "bookings", "quotations", "documents"],
  VISA_OFFICER: ["dashboard", "customers", "visa", "documents", "reports"],
  SALES_STAFF: ["dashboard", "customers", "leads", "quotations", "packages"],
  ACCOUNTANT: ["dashboard", "invoices", "payments", "wallet", "suppliers", "reports"],
  B2B_AGENT: ["agent-portal", "wallet", "customer-portal"],
  CUSTOMER: ["customer-portal"],
};

export function canAccess(role: UserRole | undefined, module: string) {
  if (!role) return false;
  const allowed = roleAccess[role] ?? [];
  return allowed.includes("*") || allowed.includes(module);
}
