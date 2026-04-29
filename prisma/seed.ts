import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { UserRole } from "../src/generated/prisma/enums";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  for (const role of Object.values(UserRole)) {
    await prisma.role.upsert({
      where: { name: role },
      update: {},
      create: { name: role, description: role.replace(/_/g, " ").toLowerCase() },
    });
  }

  const agency = await prisma.agency.upsert({
    where: { slug: "travelos-demo" },
    update: {},
    create: {
      name: "TravelOS Demo Agency",
      slug: "travelos-demo",
      email: "hello@travelos.com",
      phone: "+977-9800000000",
      address: "Thamel, Kathmandu, Nepal",
      defaultCurrency: "NPR",
    },
  });

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: "AGENCY_ADMIN" } });
  const staffRole = await prisma.role.findUniqueOrThrow({ where: { name: "TICKETING_STAFF" } });
  const agentRole = await prisma.role.findUniqueOrThrow({ where: { name: "B2B_AGENT" } });
  const customerRole = await prisma.role.findUniqueOrThrow({ where: { name: "CUSTOMER" } });

  const admin = await prisma.user.upsert({
    where: { email: "admin@travelos.com" },
    update: { passwordHash, agencyId: agency.id, roleId: adminRole.id },
    create: { agencyId: agency.id, roleId: adminRole.id, name: "Aarav Admin", email: "admin@travelos.com", phone: "+977-9811111111", title: "Agency Owner", passwordHash },
  });

  const staff = await prisma.user.upsert({
    where: { email: "staff@travelos.com" },
    update: { passwordHash, agencyId: agency.id, roleId: staffRole.id },
    create: { agencyId: agency.id, roleId: staffRole.id, name: "Nisha Ticketing", email: "staff@travelos.com", phone: "+977-9822222222", title: "Ticketing Staff", passwordHash },
  });

  const agentUser = await prisma.user.upsert({
    where: { email: "agent@travelos.com" },
    update: { passwordHash, agencyId: agency.id, roleId: agentRole.id },
    create: { agencyId: agency.id, roleId: agentRole.id, name: "B2B Agent User", email: "agent@travelos.com", phone: "+977-9833333333", title: "Sub-Agent", passwordHash },
  });

  const customers = await Promise.all(
    [
      ["Maya Shrestha", "maya@example.com", "+977-9841000001", "Nepali", "PA1234567"],
      ["Rohan Gurung", "rohan@example.com", "+977-9841000002", "Nepali", "PA2234567"],
      ["Sara Lama", "sara@example.com", "+977-9841000003", "Nepali", "PA3234567"],
    ].map(([name, email, phone, nationality, passportNumber]) =>
      prisma.customer.create({
        data: {
          agencyId: agency.id,
          name,
          email,
          phone,
          nationality,
          passportNumber,
          passportExpiry: new Date("2030-12-31"),
          address: "Kathmandu, Nepal",
          emergencyContact: "+977-9800000999",
          tags: ["VIP", "Repeat"],
          notes: "Prefers WhatsApp updates and clear invoice breakdowns.",
        },
      }),
    ),
  );

  await prisma.user.upsert({
    where: { email: "maya@example.com" },
    update: { passwordHash, agencyId: agency.id, roleId: customerRole.id },
    create: { agencyId: agency.id, roleId: customerRole.id, name: "Maya Shrestha", email: "maya@example.com", phone: "+977-9841000001", title: "Customer", passwordHash },
  });

  const supplier = await prisma.supplier.create({
    data: {
      agencyId: agency.id,
      type: "AIRLINE",
      name: "Himalayan Air Consolidator",
      contactPerson: "Kiran Rai",
      phone: "+977-9855555555",
      email: "supplier@example.com",
      openingBalance: "25000",
      notes: "Primary airfare supplier.",
    },
  });

  const agent = await prisma.agent.upsert({
    where: { userId: agentUser.id },
    update: {
      agencyId: agency.id,
      companyName: "Everest Sub Agent",
      contactPerson: "Prakash KC",
      email: "agent@travelos.com",
      phone: "+977-9866666666",
      address: "Pokhara, Nepal",
      commissionRate: "5",
      creditLimit: "150000",
      isApproved: true,
    },
    create: {
      agencyId: agency.id,
      userId: agentUser.id,
      companyName: "Everest Sub Agent",
      contactPerson: "Prakash KC",
      email: "agent@travelos.com",
      phone: "+977-9866666666",
      address: "Pokhara, Nepal",
      commissionRate: "5",
      creditLimit: "150000",
      isApproved: true,
    },
  });

  const wallet = await prisma.wallet.upsert({
    where: { agentId: agent.id },
    update: {
      agencyId: agency.id,
      balance: "85000",
      creditLimit: "150000",
    },
    create: {
      agencyId: agency.id,
      agentId: agent.id,
      balance: "85000",
      creditLimit: "150000",
      transactions: {
        create: [
          { type: "DEPOSIT", amount: "100000", reference: "BANK-001", status: "Approved", notes: "Opening wallet recharge" },
          { type: "BOOKING_DEBIT", amount: "15000", reference: "PNR-H9K2", status: "Completed", notes: "Dubai ticket booking debit" },
        ],
      },
    },
  });

  const flight = await prisma.flightBooking.create({
    data: {
      agencyId: agency.id,
      customerId: customers[0].id,
      supplierId: supplier.id,
      staffAssignedId: staff.id,
      airline: "Qatar Airways",
      flightNumber: "QR653",
      departureCity: "Kathmandu",
      arrivalCity: "Doha",
      departureAt: new Date("2026-06-15T10:00:00Z"),
      returnAt: new Date("2026-06-25T10:00:00Z"),
      pnr: "H9K2LM",
      ticketNumber: "157-1234567890",
      fareAmount: "68000",
      tax: "14000",
      serviceCharge: "2500",
      discount: "1000",
      totalAmount: "83500",
      status: "TICKETED",
      paymentStatus: "PARTIALLY_PAID",
      ticketPdfUrl: "https://example.com/tickets/H9K2LM.pdf",
    },
  });

  const visa = await prisma.visaApplication.create({
    data: {
      agencyId: agency.id,
      customerId: customers[1].id,
      assignedOfficerId: staff.id,
      country: "United Arab Emirates",
      visaType: "Tourist Visa",
      purpose: "Holiday package",
      applicationDate: new Date(),
      appointmentDate: new Date("2026-05-10"),
      expectedDecisionDate: new Date("2026-05-18"),
      passportNumber: "PA2234567",
      status: "DOCUMENTS_RECEIVED",
      paymentStatus: "UNPAID",
      documentChecklist: { passport: true, photo: true, bankStatement: false, form: true },
      notes: "Waiting for updated bank statement.",
    },
  });

  const tourPackage = await prisma.tourPackage.create({
    data: {
      agencyId: agency.id,
      title: "Dubai Premium Escape",
      destination: "Dubai",
      duration: "5 nights / 6 days",
      startDate: new Date("2026-07-05"),
      endDate: new Date("2026-07-11"),
      price: "125000",
      inclusions: "Flights, hotel, breakfast, airport transfers, desert safari",
      exclusions: "Lunch, dinner, personal expenses",
      hotels: "4-star business hotel",
      transport: "Private airport transfer",
      meals: "Breakfast included",
      availability: 12,
      status: "ACTIVE",
    },
  });

  await prisma.lead.createMany({
    data: [
      {
        agencyId: agency.id,
        assignedStaffId: staff.id,
        name: "Kabita Bista",
        phone: "+977-9841000010",
        email: "kabita@example.com",
        source: "Facebook",
        interestedDestination: "Japan",
        travelDate: new Date("2026-09-20"),
        budget: "220000",
        status: "FOLLOW_UP",
        priority: "HIGH",
        nextFollowUpDate: new Date("2026-05-02"),
        notes: "Needs student visa consultation.",
      },
      {
        agencyId: agency.id,
        assignedStaffId: staff.id,
        name: "Anil Thapa",
        phone: "+977-9841000011",
        source: "Walk-in",
        interestedDestination: "Australia",
        budget: "350000",
        status: "QUOTATION_SENT",
        priority: "MEDIUM",
        nextFollowUpDate: new Date("2026-05-04"),
      },
    ],
  });

  const invoice = await prisma.invoice.create({
    data: {
      agencyId: agency.id,
      customerId: customers[0].id,
      flightBookingId: flight.id,
      invoiceNumber: "INV-2026-0001",
      tax: "14000",
      discount: "1000",
      total: "83500",
      paidAmount: "50000",
      dueAmount: "33500",
      paymentStatus: "PARTIALLY_PAID",
      dueDate: new Date("2026-05-15"),
      items: {
        create: [{ description: "KTM-DOH return ticket", quantity: 1, unitPrice: "83500", total: "83500" }],
      },
    },
  });

  await prisma.payment.create({
    data: {
      agencyId: agency.id,
      customerId: customers[0].id,
      invoiceId: invoice.id,
      amount: "50000",
      method: "BANK_TRANSFER",
      transactionId: "NABIL-7821",
      paymentDate: new Date(),
      receivedById: admin.id,
      notes: "Partial payment received.",
    },
  });

  await prisma.packageBooking.create({
    data: {
      agencyId: agency.id,
      customerId: customers[2].id,
      tourPackageId: tourPackage.id,
      seats: 2,
      totalAmount: "250000",
      paymentStatus: "UNPAID",
    },
  });

  await prisma.quotation.create({
    data: {
      agencyId: agency.id,
      customerId: customers[2].id,
      tourPackageId: tourPackage.id,
      quoteNumber: "QTN-2026-0001",
      title: "Dubai Premium Escape for 2",
      type: "Tour Package",
      items: [{ description: "Dubai Premium Escape", quantity: 2, amount: 250000 }],
      tax: "0",
      serviceCharge: "5000",
      discount: "0",
      total: "255000",
      validUntil: new Date("2026-05-30"),
      status: "SENT",
    },
  });

  await prisma.document.createMany({
    data: [
      { agencyId: agency.id, customerId: customers[0].id, flightBookingId: flight.id, uploadedById: staff.id, type: "TICKET", title: "Qatar Airways ticket", fileUrl: "https://example.com/tickets/H9K2LM.pdf", mimeType: "application/pdf" },
      { agencyId: agency.id, customerId: customers[1].id, visaApplicationId: visa.id, uploadedById: staff.id, type: "PASSPORT", title: "Passport scan", fileUrl: "https://example.com/docs/passport.pdf", mimeType: "application/pdf", expiryDate: new Date("2030-12-31") },
    ],
  });

  await prisma.communication.create({
    data: {
      agencyId: agency.id,
      customerId: customers[0].id,
      flightBookingId: flight.id,
      channel: "WhatsApp",
      template: "Booking confirmation",
      subject: "Ticket issued",
      message: "Your Qatar Airways ticket has been issued.",
      status: "Mock sent",
    },
  });

  await prisma.notification.createMany({
    data: [
      { agencyId: agency.id, userId: staff.id, type: "FOLLOW_UP_DUE", title: "Follow-up due", body: "Kabita Bista needs a follow-up today." },
      { agencyId: agency.id, type: "PAYMENT_DUE", title: "Payment due", body: "Invoice INV-2026-0001 has NPR 33,500 outstanding." },
    ],
  });

  await prisma.setting.createMany({
    data: [
      { agencyId: agency.id, key: "currencies", value: ["NPR", "USD", "INR", "AED"] },
      { agencyId: agency.id, key: "invoice", value: { prefix: "INV", nextNumber: 2, taxName: "VAT" } },
      { agencyId: agency.id, key: "integrations", value: { stripe: "ready", esewa: "planned", khalti: "planned", whatsapp: "mock" } },
    ],
    skipDuplicates: true,
  });

  await prisma.activityLog.createMany({
    data: [
      { agencyId: agency.id, userId: admin.id, action: "created demo agency", entity: "Agency", entityId: agency.id },
      { agencyId: agency.id, userId: staff.id, action: "created flight booking", entity: "FlightBooking", entityId: flight.id },
      { agencyId: agency.id, userId: staff.id, action: "updated visa status", entity: "VisaApplication", entityId: visa.id },
      { agencyId: agency.id, userId: admin.id, action: "added wallet transaction", entity: "WalletTransaction", entityId: wallet.id },
    ],
  });

  console.log("Seeded TravelOS CRM demo data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
