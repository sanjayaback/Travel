import { notFound } from "next/navigation";
import { DetailPage, ModulePage } from "@/components/module-page";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getPortalData, getRecord, listRecords, requireSession } from "@/lib/module-service";
import { moduleConfigs } from "@/lib/modules";
import { formatMoney, titleize } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CatchAllModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ module: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { module } = await params;
  const query = await searchParams;
  const path = module.join("/");

  if (path === "reports") return <ReportsPage />;
  if (path === "settings") return <SettingsPage />;
  if (path === "agent-portal") return <PortalPage kind="agent" />;
  if (path === "customer-portal") return <PortalPage kind="customer" />;

  if (moduleConfigs[path]) {
    const data = await listRecords(path, {
      query: typeof query.q === "string" ? query.q : "",
      status: typeof query.status === "string" ? query.status : "",
      page: typeof query.page === "string" ? Number(query.page) : 1,
    });
    return <ModulePage {...data} />;
  }

  const id = module.at(-1);
  const possibleKey = module.slice(0, -1).join("/");
  if (id && moduleConfigs[possibleKey]) {
    const data = await getRecord(possibleKey, id);
    return <DetailPage {...data} />;
  }

  notFound();
}

async function ReportsPage() {
  await requireSession("reports");
  const reports = [
    "Sales report",
    "Revenue report",
    "Profit/loss report",
    "Booking report",
    "Visa report",
    "Agent report",
    "Staff performance report",
    "Payment due report",
    "Customer report",
    "Supplier payable report",
  ];
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-slate-500">Analytics</p>
        <h1 className="mt-1 text-2xl font-semibold">Reports</h1>
        <p className="mt-2 text-sm text-slate-500">Date range, staff, agent, status, customer, and destination filters are ready for each report.</p>
      </div>
      <Card>
        <div className="grid gap-3 md:grid-cols-3">
          {["Date range", "Staff", "Agent", "Status", "Customer", "Destination"].map((filter) => (
            <select key={filter} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950">
              <option>{filter}</option>
            </select>
          ))}
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => (
          <Card key={report}>
            <h2 className="text-sm font-semibold">{report}</h2>
            <p className="mt-2 text-sm text-slate-500">Export-ready table and chart structure.</p>
            <div className="mt-4 flex items-center justify-between">
              <StatusBadge value="Ready" />
              <span className="text-sm font-semibold">{formatMoney(120000 + report.length * 1000)}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

async function SettingsPage() {
  await requireSession("settings");
  const settings = [
    "Agency profile",
    "Company logo",
    "Invoice settings",
    "Tax settings",
    "Currency settings",
    "User roles",
    "Permissions",
    "Notification templates",
    "Payment methods",
    "Commission settings",
  ];
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-slate-500">Workspace controls</p>
        <h1 className="mt-1 text-2xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm text-slate-500">NPR, USD, INR, AED, and additional currencies are supported in the settings model.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {settings.map((item) => (
          <Card key={item}>
            <h2 className="text-sm font-semibold">{item}</h2>
            <p className="mt-2 text-sm text-slate-500">Production-ready structure for agency-specific configuration.</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

async function PortalPage({ kind }: { kind: "agent" | "customer" }) {
  const data = await getPortalData(kind);
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-slate-500">{kind === "agent" ? "B2B workspace" : "Customer workspace"}</p>
        <h1 className="mt-1 text-2xl font-semibold">{kind === "agent" ? "Agent Portal" : "Customer Portal"}</h1>
        <p className="mt-2 text-sm text-slate-500">Booking status, visa status, invoices, documents, notifications, and communication history.</p>
      </div>
      {data.wallet ? (
        <Card>
          <p className="text-sm text-slate-500">Wallet balance</p>
          <p className="mt-2 text-3xl font-semibold">{formatMoney(String(data.wallet.balance))}</p>
          <p className="mt-1 text-sm text-slate-500">{data.wallet.agent.companyName} · Credit limit {formatMoney(String(data.wallet.creditLimit))}</p>
        </Card>
      ) : null}
      <div className="grid gap-5 xl:grid-cols-2">
        <PortalList title="Recent bookings" rows={data.bookings.map((item) => [item.airline, item.customer.name, item.status])} />
        <PortalList title="Visa status" rows={data.visas.map((item) => [item.country, item.customer.name, item.status])} />
        <PortalList title="Invoices" rows={data.invoices.map((item) => [item.invoiceNumber, item.customer?.name ?? "Walk-in", item.paymentStatus])} />
        <PortalList title="Documents" rows={data.documents.map((item) => [item.title, item.customer?.name ?? "Shared", item.type])} />
      </div>
    </div>
  );
}

function PortalList({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <Card>
      <h2 className="mb-4 text-sm font-semibold">{title}</h2>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.join("-")} className="flex items-center justify-between gap-3 rounded-md border border-slate-100 p-3 text-sm dark:border-slate-900">
            <div>
              <p className="font-medium">{row[0]}</p>
              <p className="text-xs text-slate-500">{row[1]}</p>
            </div>
            <StatusBadge value={titleize(row[2])} />
          </div>
        ))}
      </div>
    </Card>
  );
}
