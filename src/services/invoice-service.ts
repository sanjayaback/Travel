import { prisma } from "@/lib/db";

export async function nextInvoiceNumber(agencyId: string) {
  const count = await prisma.invoice.count({ where: { agencyId } });
  return `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
}
