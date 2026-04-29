import { prisma } from "@/lib/db";

export const customerService = {
  listByAgency: (agencyId: string) => prisma.customer.findMany({ where: { agencyId, deletedAt: null }, orderBy: { createdAt: "desc" } }),
};
