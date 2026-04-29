import { prisma } from "@/lib/db";

export const notificationService = {
  notify: (data: Parameters<typeof prisma.notification.create>[0]["data"]) => prisma.notification.create({ data }),
};
