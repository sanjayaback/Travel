import { prisma } from "@/lib/db";

export const paymentService = {
  addPayment: (data: Parameters<typeof prisma.payment.create>[0]["data"]) => prisma.payment.create({ data }),
};
