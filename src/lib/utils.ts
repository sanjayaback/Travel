import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(value: number | string | null | undefined, currency = "NPR") {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function titleize(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function initials(name?: string | null) {
  return (name ?? "TravelOS")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function valueAt(record: unknown, path: string) {
  return path.split(".").reduce<unknown>((value, part) => {
    if (value && typeof value === "object") return (value as Record<string, unknown>)[part];
    return undefined;
  }, record);
}
