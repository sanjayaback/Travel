"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Filter, Pencil, Plus, Search, Send, Trash2, UserPlus, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import type { ModuleConfig, ModuleField } from "@/lib/modules";
import { formatMoney, titleize, valueAt } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

type Options = {
  customers: { id: string; name: string }[];
  staff: { id: string; name: string | null; email: string }[];
  suppliers: { id: string; name: string }[];
  agents: { id: string; companyName: string }[];
  packages: { id: string; title: string }[];
  invoices: { id: string; invoiceNumber: string }[];
};

function display(value: unknown, field: string, amountField?: string) {
  if (value == null || value === "") return "None";
  if (field === amountField) return formatMoney(String(value));
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).toLocaleDateString();
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function relationOptions(field: ModuleField, options: Options) {
  if (field.relation === "customers") return options.customers.map((item) => ({ id: item.id, label: item.name }));
  if (field.relation === "staff") return options.staff.map((item) => ({ id: item.id, label: item.name ?? item.email }));
  if (field.relation === "suppliers") return options.suppliers.map((item) => ({ id: item.id, label: item.name }));
  if (field.relation === "agents") return options.agents.map((item) => ({ id: item.id, label: item.companyName }));
  if (field.relation === "packages") return options.packages.map((item) => ({ id: item.id, label: item.title }));
  if (field.relation === "invoices") return options.invoices.map((item) => ({ id: item.id, label: item.invoiceNumber }));
  return [];
}

function inputDateValue(value: unknown, type?: string) {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  if (type === "datetime-local") return date.toISOString().slice(0, 16);
  if (type === "date") return date.toISOString().slice(0, 10);
  return String(value);
}

function FieldInput({ field, options, record }: { field: ModuleField; options: Options; record?: Record<string, unknown> | null }) {
  const shared = "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950";
  const defaultValue = inputDateValue(valueAt(record, field.name), field.type);
  if (field.type === "textarea") {
    return <textarea name={field.name} required={field.required} placeholder={field.placeholder} defaultValue={defaultValue} className={`${shared} min-h-24 py-2`} />;
  }
  if (field.type === "select") {
    const opts = field.relation ? relationOptions(field, options) : (field.options ?? []).map((item) => ({ id: item, label: titleize(item) }));
    return (
      <select name={field.name} required={field.required} className={shared} defaultValue={defaultValue}>
        <option value="">Select {field.label.toLowerCase()}</option>
        {opts.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
    );
  }
  return <input name={field.name} required={field.required} type={field.type ?? "text"} placeholder={field.placeholder} defaultValue={defaultValue} className={shared} />;
}

export function ModulePage({
  config,
  records,
  total,
  page,
  pageCount,
  options,
}: {
  config: ModuleConfig;
  records: Record<string, unknown>[];
  total: number;
  page: number;
  pageCount: number;
  options: Options;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Record<string, unknown> | null>(null);
  const [isPending, startTransition] = useTransition();
  const query = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";

  const statusOptions = useMemo(() => {
    if (!config.badgeField || config.badgeField.includes(".")) return [];
    return Array.from(new Set(records.map((record) => valueAt(record, config.badgeField!)).filter(Boolean))).map(String);
  }, [config.badgeField, records]);

  function updateSearch(formData: FormData) {
    const params = new URLSearchParams();
    const q = String(formData.get("q") ?? "");
    const nextStatus = String(formData.get("status") ?? "");
    if (q) params.set("q", q);
    if (nextStatus) params.set("status", nextStatus);
    router.push(`${config.href}?${params.toString()}`);
  }

  function exportCsv() {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (status) params.set("status", status);
    window.open(`/api/modules/${config.key}?${params.toString()}`, "_blank");
  }

  function openCreate() {
    setEditingRecord(null);
    setOpen(true);
  }

  function openEdit(record: Record<string, unknown>) {
    setEditingRecord(record);
    setOpen(true);
  }

  async function save(formData: FormData) {
    if (editingRecord?.id) formData.set("id", String(editingRecord.id));
    const response = await fetch(`/api/modules/${config.key}`, {
      method: editingRecord ? "PATCH" : "POST",
      body: formData,
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const details = payload?.details ? Object.values(payload.details).join(", ") : payload?.error;
      toast.error(details || "Unable to save record");
      return;
    }
    toast.success(`${config.singular} ${editingRecord ? "updated" : "saved"}`);
    setOpen(false);
    setEditingRecord(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm(`Delete this ${config.singular.toLowerCase()}?`)) return;
    const response = await fetch(`/api/modules/${config.key}`, {
      method: "DELETE",
      body: JSON.stringify({ id }),
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      toast.error(payload?.error || "Delete failed");
      return;
    }
    toast.success(`${config.singular} deleted`);
    router.refresh();
  }

  async function convertLead(id: string) {
    const response = await fetch("/api/actions/leads/convert", {
      method: "POST",
      body: JSON.stringify({ id }),
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      toast.error(payload?.error || "Lead conversion failed");
      return;
    }
    toast.success("Lead converted to customer");
    router.refresh();
  }

  async function sendCommunication(id: string, channel: "Email" | "WhatsApp" = "WhatsApp") {
    const response = await fetch("/api/actions/communications/send", {
      method: "POST",
      body: JSON.stringify({ module: config.key, id, channel }),
      headers: { "Content-Type": "application/json" },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      toast.error(payload?.error || "Communication failed");
      return;
    }
    toast.success(`${channel} queued: ${payload?.providerResult?.messageId ?? "mock message"}`);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">TravelOS CRM</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{config.title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">{config.description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={exportCsv}>
            <Download className="size-4" />
            Export
          </Button>
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            New {config.singular}
          </Button>
        </div>
      </div>

      <Card className="space-y-4">
        <form action={updateSearch} className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input name="q" defaultValue={query} placeholder={`Search ${config.title.toLowerCase()}`} className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950" />
          </div>
          <select name="status" defaultValue={status} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950">
            <option value="">All statuses</option>
            {statusOptions.map((item) => (
              <option key={item} value={item}>
                {titleize(item)}
              </option>
            ))}
          </select>
          <Button type="submit" variant="secondary">
            <Filter className="size-4" />
            Filter
          </Button>
        </form>

        {records.length === 0 ? (
          <div className="grid min-h-72 place-items-center rounded-lg border border-dashed border-slate-300 text-center dark:border-slate-800">
            <div>
              <p className="text-sm font-semibold">No {config.title.toLowerCase()} yet</p>
              <p className="mt-1 text-sm text-slate-500">Create the first record to start managing this workflow.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">
                  {config.tableFields.map((field) => (
                    <th key={field} className="px-3 py-3 font-semibold">{titleize(field.split(".").pop() ?? field)}</th>
                  ))}
                  <th className="px-3 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={String(record.id)} className="border-b border-slate-100 dark:border-slate-900">
                    {config.tableFields.map((field) => {
                      const value = valueAt(record, field);
                      return (
                        <td key={field} className="px-3 py-3 align-middle">
                          {field === config.badgeField ? <StatusBadge value={value} /> : display(value, field, config.amountField)}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {["quotations", "invoices", "documents", "bookings/flights"].includes(config.key) ? (
                          <Button variant="ghost" className="h-8 px-2" onClick={() => sendCommunication(String(record.id))}>
                            <Send className="size-4" />
                          </Button>
                        ) : null}
                        {config.key === "leads" && valueAt(record, "status") !== "CONVERTED" ? (
                          <Button variant="ghost" className="h-8 px-2" onClick={() => convertLead(String(record.id))}>
                            <UserPlus className="size-4" />
                          </Button>
                        ) : null}
                        {["customers", "bookings/flights", "visa", "packages", "agents"].includes(config.key) ? (
                          <Link className="inline-flex h-8 items-center rounded-md px-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-900" href={`${config.href}/${String(record.id)}`}>
                            View
                          </Link>
                        ) : null}
                        <Button variant="ghost" className="h-8 px-2" onClick={() => openEdit(record)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" className="h-8 px-2 text-rose-600" onClick={() => remove(String(record.id))}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-sm text-slate-500 dark:border-slate-900">
          <span>{total} total records</span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" disabled={page <= 1} onClick={() => router.push(`${config.href}?page=${page - 1}`)}>Previous</Button>
            <span>Page {page} of {pageCount}</span>
            <Button variant="secondary" disabled={page >= pageCount} onClick={() => router.push(`${config.href}?page=${page + 1}`)}>Next</Button>
          </div>
        </div>
      </Card>

      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40">
          <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-xl dark:bg-slate-950">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{editingRecord ? "Edit" : "New"} {config.singular}</h2>
                <p className="text-sm text-slate-500">Validated server-side and written to Prisma.</p>
              </div>
              <button className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-900" onClick={() => setOpen(false)} aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <form
              action={(formData) => {
                startTransition(() => save(formData));
              }}
              className="grid gap-4 sm:grid-cols-2"
            >
              {config.fields.map((field) => (
                <label key={field.name} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
                  <span className="mb-1 block text-sm font-medium">{field.label}</span>
                  <FieldInput field={field} options={options} record={editingRecord} />
                </label>
              ))}
              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 sm:col-span-2 dark:border-slate-800">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
                <Button disabled={isPending} type="submit">{isPending ? "Saving..." : editingRecord ? "Update record" : "Save record"}</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function DetailPage({ config, record }: { config: ModuleConfig; record: Record<string, unknown> | null }) {
  if (!record) {
    return (
      <Card>
        <p className="text-sm font-semibold">Record not found</p>
      </Card>
    );
  }
  const entries = config.fields.map((field) => [field.label, display(valueAt(record, field.name), field.name, config.amountField)]);
  const recordId = String(record.id);
  async function sendCommunication(channel: "Email" | "WhatsApp") {
    const response = await fetch("/api/actions/communications/send", {
      method: "POST",
      body: JSON.stringify({ module: config.key, id: recordId, channel }),
      headers: { "Content-Type": "application/json" },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      toast.error(payload?.error || "Communication failed");
      return;
    }
    toast.success(`${channel} queued: ${payload?.providerResult?.messageId ?? "mock message"}`);
  }
  return (
    <div className="space-y-5">
      <div>
        <Link href={config.href} className="text-sm font-medium text-slate-500 hover:text-slate-950 dark:hover:text-white">Back to {config.title}</Link>
        <h1 className="mt-2 text-2xl font-semibold">{config.singular} Details</h1>
        <p className="mt-1 text-sm text-slate-500">Timeline, linked records, documents, communications, and internal notes.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.4fr_.8fr]">
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            {entries.map(([label, value]) => (
              <div key={label}>
                <p className="text-xs uppercase text-slate-500">{label}</p>
                <p className="mt-1 text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold">Workflow actions</h2>
          <div className="mt-4 grid gap-2">
            <Button variant="secondary" onClick={() => sendCommunication("Email")}><Send className="size-4" />Email ready</Button>
            <Button variant="secondary" onClick={() => sendCommunication("WhatsApp")}><Send className="size-4" />WhatsApp ready</Button>
            <Button variant="secondary"><Download className="size-4" />PDF ready</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
