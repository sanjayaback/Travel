import { prisma } from "@/lib/db";

export const agentService = {
  approve: (id: string) => prisma.agent.update({ where: { id }, data: { isApproved: true } }),
};
