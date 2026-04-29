import { prisma } from "@/lib/db";

export const walletService = {
  addTransaction: (data: Parameters<typeof prisma.walletTransaction.create>[0]["data"]) => prisma.walletTransaction.create({ data }),
};
