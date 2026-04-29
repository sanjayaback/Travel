# TravelOS CRM

TravelOS CRM is a modern travel agency SaaS platform for agencies, flight ticketing offices, visa consultancies, tour operators, and B2B sub-agents.

It includes authentication, agency-scoped data, role-aware route protection, CRM modules, bookings, visa files, packages, quotations, invoices, payments, B2B wallets, suppliers, documents, reports, settings, mock communication services, and seed data.

Operational workflows included in the MVP:

- Create, edit, delete, search, filter, paginate, and CSV-export CRM records
- Convert leads into customers with audit logging
- Queue mock Email/WhatsApp communication from supported records and store communication history
- Recalculate invoice paid/due/payment status automatically when payments change
- Enforce server-side validation and agency-owned relation checks before writes
- Show role-specific navigation while keeping server-side permission checks authoritative
- Scope agent and customer portals to the signed-in agent/customer identity

## Tech Stack

- Next.js App Router, TypeScript, Tailwind CSS
- Prisma 7 with PostgreSQL
- NextAuth/Auth.js credentials authentication
- Lucide icons, Recharts, Sonner toasts
- Mock-ready service layer for GDS, WhatsApp, email, and payments

## Installation

```bash
npm install
cp .env.example .env
```

Update `.env` with a PostgreSQL connection string and a secure `NEXTAUTH_SECRET`.

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

Open `http://localhost:3000`.

## Demo Logins

- Admin: `admin@travelos.com` / `password123`
- Agent: `agent@travelos.com` / `password123`
- Staff: `staff@travelos.com` / `password123`
- Customer: `maya@example.com` / `password123`

## Project Structure

- `prisma/schema.prisma`: relational SaaS schema with UUIDs, agency scoping, enums, indexes, and soft deletes
- `prisma/seed.ts`: demo agency, users, customers, leads, bookings, visas, packages, invoices, payments, agents, wallets, suppliers, documents
- `src/app`: App Router pages, auth routes, protected CRM routes, module API
- `src/components`: app shell, dashboard charts, reusable module CRUD UI, status badges, cards, buttons
- `src/lib`: auth, Prisma client, permission matrix, module definitions, server services
- `src/services`: customer, lead, booking, visa, invoice, payment, agent, wallet, notification, WhatsApp mock, email mock, GDS mock
- `src/app/api/actions`: workflow endpoints for lead conversion and communication sending

## Main Routes

`/login`, `/register`, `/dashboard`, `/customers`, `/customers/[id]`, `/leads`, `/bookings/flights`, `/bookings/flights/[id]`, `/visa`, `/visa/[id]`, `/packages`, `/packages/[id]`, `/quotations`, `/invoices`, `/payments`, `/agents`, `/agents/[id]`, `/wallet`, `/suppliers`, `/documents`, `/reports`, `/staff`, `/settings`, `/customer-portal`, `/agent-portal`.

## Database Notes

The Prisma schema includes the required models: `User`, `Agency`, `Role`, `Permission`, `Customer`, `Lead`, `FlightBooking`, `VisaApplication`, `TourPackage`, `PackageBooking`, `Quotation`, `Invoice`, `InvoiceItem`, `Payment`, `Agent`, `Wallet`, `WalletTransaction`, `Supplier`, `Document`, `Communication`, `Notification`, `ActivityLog`, and `Setting`.

All business records are scoped by `agencyId` where appropriate. Dashboard routes use NextAuth sessions and a role permission matrix in `src/lib/permissions.ts`.

## Future Integration Notes

- Travelport, Amadeus, Sabre: replace `src/services/gds-flight-api.ts` with provider adapters behind the same search/booking contract.
- WhatsApp Cloud API: replace `src/services/whatsapp-service.ts` with Meta API calls and webhook processing.
- Resend: replace `src/services/email-service.ts` with Resend send calls and template rendering.
- Stripe: add checkout/payment intent handlers using the existing invoice/payment models.
- eSewa/Khalti: add provider-specific payment verification and map successful callbacks into `Payment` records.
- Cloudinary/S3: wire secure uploads into `Document` records and enforce role-based access before serving files.

## Verification

```bash
npm run lint
npm run build
```
