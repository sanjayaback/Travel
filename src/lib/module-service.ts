import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { moduleConfigs, type ModuleConfig } from "@/lib/modules";
import { parseModuleForm } from "@/lib/validation";
import type { UserRole } from "@/generated/prisma/enums";
import { titleize, valueAt } from "@/lib/utils";
import { sendEmail } from "@/services/email-service";
import { sendWhatsAppMessage } from "@/services/whatsapp-service";
export { valueAt } from "@/lib/utils";

type SessionContext = {
  userId: string;
  agencyId: string;
  email?: string | null;
  role?: UserRole;
};

type PaymentSnapshot = {
  invoiceId?: string | null;
};

type CommunicationChannel = "Email" | "WhatsApp" | "SMS";

export async function requireSession(module = "dashboard"): Promise<SessionContext> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.agencyId) redirect("/login");
  const role = session.user.role as UserRole | undefined;
  if (!canAccess(role, module)) redirect(role === "B2B_AGENT" ? "/agent-portal" : "/customer-portal");
  return { userId: session.user.id, agencyId: session.user.agencyId, email: session.user.email, role };
}

export function getModuleConfig(key: string) {
  const config = moduleConfigs[key];
  if (!config) throw new Error(`Unknown module: ${key}`);
  return config;
}

type Delegate = {
  findMany(args: unknown): Promise<Record<string, unknown>[]>;
  findFirst(args: unknown): Promise<Record<string, unknown> | null>;
  findFirstOrThrow(args: unknown): Promise<Record<string, unknown>>;
  count(args: unknown): Promise<number>;
  create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<{ id: string }>;
  delete(args: { where: { id: string } }): Promise<{ id: string }>;
};

function model(config: ModuleConfig): Delegate {
  return (prisma as unknown as Record<string, Delegate>)[config.model];
}

function searchWhere(config: ModuleConfig, query: string) {
  if (!query) return undefined;
  return {
    OR: config.searchFields.map((field) => ({
      [field]: { contains: query, mode: "insensitive" },
    })),
  };
}

function agencyWhere(config: ModuleConfig, agencyId: string) {
  if (config.model === "walletTransaction") {
    return { wallet: { agencyId } };
  }
  return { agencyId };
}

async function assertRecordAccess(config: ModuleConfig, id: string, agencyId: string) {
  const record = await model(config).findFirst({
    where: {
      id,
      ...agencyWhere(config, agencyId),
      ...(config.softDelete ? { deletedAt: null } : {}),
    },
  });
  if (!record) throw new Error("Record not found or access denied");
  return record;
}

async function syncInvoicePaymentStatus(invoiceId?: string | null) {
  if (!invoiceId) return;
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, select: { id: true, total: true, dueDate: true } });
  if (!invoice) return;
  const paid = await prisma.payment.aggregate({
    where: { invoiceId, deletedAt: null },
    _sum: { amount: true },
  });
  const total = Number(invoice.total);
  const paidAmount = Number(paid._sum.amount ?? 0);
  const dueAmount = Math.max(total - paidAmount, 0);
  const paymentStatus =
    dueAmount === 0 && paidAmount > 0
      ? "PAID"
      : paidAmount > 0
        ? "PARTIALLY_PAID"
        : invoice.dueDate && invoice.dueDate < new Date()
          ? "OVERDUE"
          : "UNPAID";

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      paidAmount: String(paidAmount),
      dueAmount: String(dueAmount),
      paymentStatus,
    },
  });
}

async function assertRelationAccess(config: ModuleConfig, data: Record<string, unknown>, agencyId: string) {
  const checks = config.fields
    .filter((field) => field.relation && data[field.name])
    .map(async (field) => {
      const id = String(data[field.name]);
      if (field.relation === "customers") {
        await prisma.customer.findFirstOrThrow({ where: { id, agencyId, deletedAt: null } });
      }
      if (field.relation === "staff") {
        await prisma.user.findFirstOrThrow({ where: { id, agencyId, deletedAt: null } });
      }
      if (field.relation === "suppliers") {
        await prisma.supplier.findFirstOrThrow({ where: { id, agencyId, deletedAt: null } });
      }
      if (field.relation === "agents") {
        await prisma.agent.findFirstOrThrow({ where: { id, agencyId, deletedAt: null } });
      }
      if (field.relation === "packages") {
        await prisma.tourPackage.findFirstOrThrow({ where: { id, agencyId, deletedAt: null } });
      }
      if (field.relation === "invoices") {
        await prisma.invoice.findFirstOrThrow({ where: { id, agencyId, deletedAt: null } });
      }
    });

  await Promise.all(checks);
}

export async function listRecords(key: string, params: { query?: string; status?: string; page?: number } = {}) {
  const config = getModuleConfig(key);
  const ctx = await requireSession(config.module);
  const page = Math.max(Number(params.page ?? 1), 1);
  const take = 12;
  const where: Record<string, unknown> = {};

  Object.assign(where, agencyWhere(config, ctx.agencyId));
  if (config.softDelete) where.deletedAt = null;
  if (params.query) Object.assign(where, searchWhere(config, params.query));
  if (params.status && config.badgeField && !config.badgeField.includes(".")) {
    where[config.badgeField] = params.status;
  }

  const [records, total, options] = await Promise.all([
    model(config).findMany({
      where,
      include: config.include,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take,
    }),
    model(config).count({ where }),
    getRelationOptions(ctx.agencyId),
  ]);

  return { config, records, total, page, pageCount: Math.max(Math.ceil(total / take), 1), options };
}

export async function getRecord(key: string, id: string) {
  const config = getModuleConfig(key);
  const ctx = await requireSession(config.module);
  const where: Record<string, unknown> = { id };
  Object.assign(where, agencyWhere(config, ctx.agencyId));
  if (config.softDelete) where.deletedAt = null;
  const record = await model(config).findFirst({ where, include: config.include });
  return { config, record };
}

export async function exportRecords(key: string, params: { query?: string; status?: string } = {}) {
  const config = getModuleConfig(key);
  const ctx = await requireSession(config.module);
  const where: Record<string, unknown> = {};
  Object.assign(where, agencyWhere(config, ctx.agencyId));
  if (config.softDelete) where.deletedAt = null;
  if (params.query) Object.assign(where, searchWhere(config, params.query));
  if (params.status && config.badgeField && !config.badgeField.includes(".")) {
    where[config.badgeField] = params.status;
  }

  const records = await model(config).findMany({
    where,
    include: config.include,
    orderBy: { createdAt: "desc" },
    take: 1000,
  });
  const headers = config.tableFields.map((field) => titleize(field.split(".").pop() ?? field));
  const rows = records.map((record) => config.tableFields.map((field) => valueAt(record, field)));
  return toCsv([headers, ...rows]);
}

function toCsv(rows: unknown[][]) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell instanceof Date ? cell.toISOString() : String(cell ?? "");
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(","),
    )
    .join("\n");
}

export async function getDashboardData() {
  const ctx = await requireSession("dashboard");
  const agencyId = ctx.agencyId;
  const [
    leads,
    customers,
    bookings,
    revenue,
    pendingVisas,
    pendingPayments,
    recentActivities,
    topDestinations,
    agentWallets,
  ] = await Promise.all([
    prisma.lead.count({ where: { agencyId, deletedAt: null } }),
    prisma.customer.count({ where: { agencyId, deletedAt: null } }),
    prisma.flightBooking.count({ where: { agencyId, deletedAt: null } }),
    prisma.payment.aggregate({ where: { agencyId, deletedAt: null }, _sum: { amount: true } }),
    prisma.visaApplication.count({
      where: { agencyId, deletedAt: null, status: { notIn: ["APPROVED", "REJECTED", "DELIVERED_TO_CUSTOMER"] } },
    }),
    prisma.invoice.count({ where: { agencyId, deletedAt: null, paymentStatus: { in: ["UNPAID", "PARTIALLY_PAID", "OVERDUE"] } } }),
    prisma.activityLog.findMany({ where: { agencyId }, include: { user: true }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.tourPackage.findMany({ where: { agencyId, deletedAt: null }, select: { destination: true }, take: 50 }),
    prisma.wallet.findMany({ where: { agencyId }, include: { agent: true }, take: 5, orderBy: { balance: "desc" } }),
  ]);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((month, index) => ({
    month,
    revenue: [120000, 164000, 142000, 188000, 216000, 248000][index],
    bookings: [18, 24, 21, 30, 36, 42][index],
  }));

  return {
    cards: { leads, customers, bookings, revenue: Number(revenue._sum.amount ?? 0), pendingVisas, pendingPayments },
    recentActivities,
    topDestinations: Object.entries(
      topDestinations.reduce<Record<string, number>>((acc, item) => {
        acc[item.destination] = (acc[item.destination] ?? 0) + 1;
        return acc;
      }, {}),
    )
      .map(([destination, count]) => ({ destination, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    agentWallets,
    months,
  };
}

export async function getPortalData(kind: "agent" | "customer") {
  const ctx = await requireSession(kind === "agent" ? "agent-portal" : "customer-portal");
  const agencyId = ctx.agencyId;
  const empty = { bookings: [], visas: [], invoices: [], documents: [], notifications: [], wallet: null };
  const notificationsPromise = prisma.notification.findMany({
    where: { agencyId, OR: [{ userId: ctx.userId }, { userId: null }] },
    take: 6,
    orderBy: { createdAt: "desc" },
  });

  if (kind === "agent") {
    const agent = await prisma.agent.findFirst({
      where: {
        agencyId,
        deletedAt: null,
        OR: [{ userId: ctx.userId }, ...(ctx.email ? [{ email: ctx.email }] : [])],
      },
    });
    if (!agent) return { ...empty, notifications: await notificationsPromise };
    const [wallet, notifications] = await Promise.all([
      prisma.wallet.findFirst({
        where: { agencyId, agentId: agent.id },
        include: { agent: true, transactions: { take: 6, orderBy: { createdAt: "desc" } } },
      }),
      notificationsPromise,
    ]);
    return { ...empty, notifications, wallet };
  }

  const customer = ctx.email
    ? await prisma.customer.findFirst({ where: { agencyId, email: ctx.email, deletedAt: null } })
    : null;
  if (!customer) return { ...empty, notifications: await notificationsPromise };

  const [bookings, visas, invoices, documents, notifications] = await Promise.all([
    prisma.flightBooking.findMany({ where: { agencyId, customerId: customer.id, deletedAt: null }, include: { customer: true }, take: 6, orderBy: { createdAt: "desc" } }),
    prisma.visaApplication.findMany({ where: { agencyId, customerId: customer.id, deletedAt: null }, include: { customer: true }, take: 6, orderBy: { createdAt: "desc" } }),
    prisma.invoice.findMany({ where: { agencyId, customerId: customer.id, deletedAt: null }, include: { customer: true }, take: 6, orderBy: { createdAt: "desc" } }),
    prisma.document.findMany({ where: { agencyId, customerId: customer.id, deletedAt: null }, include: { customer: true }, take: 6, orderBy: { createdAt: "desc" } }),
    notificationsPromise,
  ]);
  return { bookings, visas, invoices, documents, notifications, wallet: null };
}

export async function getRelationOptions(agencyId: string) {
  const [customers, staff, suppliers, agents, packages, invoices] = await Promise.all([
    prisma.customer.findMany({ where: { agencyId, deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 100 }),
    prisma.user.findMany({ where: { agencyId, deletedAt: null }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" }, take: 100 }),
    prisma.supplier.findMany({ where: { agencyId, deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 100 }),
    prisma.agent.findMany({ where: { agencyId, deletedAt: null }, select: { id: true, companyName: true }, orderBy: { companyName: "asc" }, take: 100 }),
    prisma.tourPackage.findMany({ where: { agencyId, deletedAt: null }, select: { id: true, title: true }, orderBy: { title: "asc" }, take: 100 }),
    prisma.invoice.findMany({ where: { agencyId, deletedAt: null }, select: { id: true, invoiceNumber: true }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  return { customers, staff, suppliers, agents, packages, invoices };
}

function sumFlight(data: Record<string, unknown>) {
  const fare = Number(data.fareAmount ?? 0);
  const tax = Number(data.tax ?? 0);
  const service = Number(data.serviceCharge ?? 0);
  const discount = Number(data.discount ?? 0);
  return String(Math.max(fare + tax + service - discount, 0));
}

export async function createRecord(key: string, formData: FormData) {
  const config = getModuleConfig(key);
  const ctx = await requireSession(config.module);
  const data = parseModuleForm(config, formData);
  await assertRelationAccess(config, data, ctx.agencyId);

  if (config.model !== "walletTransaction") data.agencyId = ctx.agencyId;
  if (config.model === "payment") data.receivedById = ctx.userId;
  if (config.model === "flightBooking") data.totalAmount = sumFlight(data);
  if (config.model === "quotation") data.items = [{ description: data.title ?? "Travel service", quantity: 1, amount: data.total ?? 0 }];
  if (config.model === "user") {
    const roleName = String(data.roleName ?? "SALES_STAFF");
    delete data.roleName;
    data.role = { connect: { name: roleName } };
    data.passwordHash = await import("bcryptjs").then((bcrypt) => bcrypt.hash("password123", 10));
  }
  if (config.model === "walletTransaction") {
    const agentId = String(data.agentId);
    delete data.agentId;
    let wallet = await prisma.wallet.findFirst({ where: { agencyId: ctx.agencyId, agentId } });
    if (!wallet) {
      const agent = await prisma.agent.findFirstOrThrow({ where: { id: agentId, agencyId: ctx.agencyId } });
      wallet = await prisma.wallet.create({ data: { agencyId: ctx.agencyId, agentId, creditLimit: agent.creditLimit } });
    }
    data.walletId = wallet.id;
  }

  const record = await model(config).create({ data });
  if (config.model === "payment") await syncInvoicePaymentStatus(String(data.invoiceId ?? ""));
  await logActivity(ctx, `created ${config.singular.toLowerCase()}`, config.model, record.id);
  return record;
}

export async function updateRecord(key: string, id: string, formData: FormData) {
  const config = getModuleConfig(key);
  const ctx = await requireSession(config.module);
  const existing = (await assertRecordAccess(config, id, ctx.agencyId)) as PaymentSnapshot;
  const data = parseModuleForm(config, formData);
  await assertRelationAccess(config, data, ctx.agencyId);
  if (config.model === "flightBooking") data.totalAmount = sumFlight(data);
  if (config.model === "user" && data.roleName) {
    const roleName = String(data.roleName);
    delete data.roleName;
    data.role = { connect: { name: roleName } };
  }
  if (config.model === "walletTransaction") {
    const agentId = data.agentId ? String(data.agentId) : undefined;
    delete data.agentId;
    if (agentId) {
      const wallet = await prisma.wallet.findFirstOrThrow({ where: { agencyId: ctx.agencyId, agentId } });
      data.walletId = wallet.id;
    }
  }
  await model(config).update({ where: { id }, data });
  if (config.model === "payment") {
    await syncInvoicePaymentStatus(existing.invoiceId);
    await syncInvoicePaymentStatus(String(data.invoiceId ?? ""));
  }
  await logActivity(ctx, `updated ${config.singular.toLowerCase()}`, config.model, id);
}

export async function deleteRecord(key: string, id: string) {
  const config = getModuleConfig(key);
  const ctx = await requireSession(config.module);
  const existing = (await assertRecordAccess(config, id, ctx.agencyId)) as PaymentSnapshot;
  if (config.softDelete) {
    await model(config).update({ where: { id }, data: { deletedAt: new Date() } });
  } else {
    await model(config).delete({ where: { id } });
  }
  if (config.model === "payment") await syncInvoicePaymentStatus(existing.invoiceId);
  await logActivity(ctx, `deleted ${config.singular.toLowerCase()}`, config.model, id);
}

export async function convertLeadToCustomer(leadId: string) {
  const config = getModuleConfig("leads");
  const ctx = await requireSession("leads");
  const lead = await prisma.lead.findFirstOrThrow({
    where: { id: leadId, agencyId: ctx.agencyId, deletedAt: null },
  });
  const customer = await prisma.customer.create({
    data: {
      agencyId: ctx.agencyId,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      notes: lead.notes,
      tags: ["Converted Lead"],
    },
  });
  await prisma.lead.update({ where: { id: leadId }, data: { status: "CONVERTED" } });
  await logActivity(ctx, "converted lead to customer", config.model, leadId);
  await logActivity(ctx, "created customer from lead", "customer", customer.id);
  return customer;
}

export async function sendRecordCommunication(key: string, id: string, channel: CommunicationChannel) {
  const config = getModuleConfig(key);
  const ctx = await requireSession(config.module);
  const record = await model(config).findFirst({
    where: {
      id,
      ...agencyWhere(config, ctx.agencyId),
      ...(config.softDelete ? { deletedAt: null } : {}),
    },
    include: config.include,
  });
  if (!record) throw new Error("Record not found or access denied");

  const customerId = String(valueAt(record, "customerId") ?? valueAt(record, "customer.id") ?? "");
  const customerEmail = String(valueAt(record, "customer.email") ?? "");
  const customerPhone = String(valueAt(record, "customer.phone") ?? "");
  const customerName = String(valueAt(record, "customer.name") ?? "Customer");
  if (!customerId) throw new Error("This record is not linked to a customer");

  const subject = `${config.singular} update from TravelOS CRM`;
  const message = `Hello ${customerName}, your ${config.singular.toLowerCase()} update is ready.`;
  const providerResult =
    channel === "Email"
      ? await sendEmail({ to: customerEmail || "customer@example.com", subject, html: `<p>${message}</p>` })
      : channel === "WhatsApp"
        ? await sendWhatsAppMessage({ to: customerPhone || "+9779800000000", template: "travelos_status_update", variables: { name: customerName, module: config.singular } })
        : { provider: "mock-sms", status: "queued", messageId: `mock-sms-${Date.now()}` };

  const communication = await prisma.communication.create({
    data: {
      agencyId: ctx.agencyId,
      customerId,
      flightBookingId: config.model === "flightBooking" ? id : undefined,
      visaApplicationId: config.model === "visaApplication" ? id : undefined,
      channel,
      template: `${config.singular} status update`,
      subject,
      message,
      status: providerResult.status,
    },
  });
  await logActivity(ctx, `queued ${channel.toLowerCase()} communication`, "communication", communication.id);
  return { communication, providerResult };
}

export async function logActivity(ctx: SessionContext, action: string, entity: string, entityId?: string) {
  await prisma.activityLog.create({
    data: {
      agencyId: ctx.agencyId,
      userId: ctx.userId,
      action,
      entity,
      entityId,
    },
  });
}
