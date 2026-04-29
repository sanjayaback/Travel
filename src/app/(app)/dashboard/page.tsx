import { Activity, BadgeDollarSign, Clock, Plane, Users, WalletCards } from "lucide-react";
import { BookingChart, RevenueChart } from "@/components/dashboard-charts";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getDashboardData } from "@/lib/module-service";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardData();
  const cards = [
    { label: "Total leads", value: data.cards.leads, icon: Activity },
    { label: "Customers", value: data.cards.customers, icon: Users },
    { label: "Flight bookings", value: data.cards.bookings, icon: Plane },
    { label: "Monthly revenue", value: formatMoney(data.cards.revenue), icon: BadgeDollarSign },
    { label: "Pending visas", value: data.cards.pendingVisas, icon: Clock },
    { label: "Pending payments", value: data.cards.pendingPayments, icon: WalletCards },
  ];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-slate-500">Command center</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Leads, bookings, revenue, visas, agent performance, and follow-up signals in one place.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{card.label}</p>
                <Icon className="size-4 text-slate-400" />
              </div>
              <p className="mt-4 text-2xl font-semibold">{card.value}</p>
            </Card>
          );
        })}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-sm font-semibold">Revenue graph</h2>
          <RevenueChart data={data.months} />
        </Card>
        <Card>
          <h2 className="mb-4 text-sm font-semibold">Booking status chart</h2>
          <BookingChart data={data.months} />
        </Card>
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <Card>
          <h2 className="mb-4 text-sm font-semibold">Recent activities</h2>
          <div className="space-y-3">
            {data.recentActivities.map((item) => (
              <div key={item.id} className="rounded-md border border-slate-100 p-3 text-sm dark:border-slate-900">
                <p className="font-medium">{item.action}</p>
                <p className="text-xs text-slate-500">{item.user?.name ?? "System"} · {item.entity}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 text-sm font-semibold">Top destinations</h2>
          <div className="space-y-3">
            {data.topDestinations.map((item) => (
              <div key={item.destination} className="flex items-center justify-between text-sm">
                <span>{item.destination}</span>
                <StatusBadge value={`${item.count} packages`} />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 text-sm font-semibold">Agent performance</h2>
          <div className="space-y-3">
            {data.agentWallets.map((wallet) => (
              <div key={wallet.id} className="flex items-center justify-between text-sm">
                <span>{wallet.agent.companyName}</span>
                <span className="font-semibold">{formatMoney(String(wallet.balance))}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
