import { prisma } from "@/lib/db";

export const visaService = {
  updateStatus: (id: string, status: Parameters<typeof prisma.visaApplication.update>[0]["data"]["status"]) =>
    prisma.visaApplication.update({ where: { id }, data: { status } }),
};
