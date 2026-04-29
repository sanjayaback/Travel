import { prisma } from "@/lib/db";

export const leadService = {
  convertToCustomer: async (leadId: string) => {
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
    const customer = await prisma.customer.create({
      data: { agencyId: lead.agencyId, name: lead.name, phone: lead.phone, email: lead.email, notes: lead.notes },
    });
    await prisma.lead.update({ where: { id: leadId }, data: { status: "CONVERTED" } });
    return customer;
  },
};
