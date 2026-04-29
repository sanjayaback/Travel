import { prisma } from "@/lib/db";

export const bookingService = {
  calculateProfit: (total: number, supplierCost: number) => total - supplierCost,
  listFlights: (agencyId: string) => prisma.flightBooking.findMany({ where: { agencyId, deletedAt: null }, include: { customer: true } }),
};
