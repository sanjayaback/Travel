import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <Card>
      <h1 className="text-lg font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-slate-500">The TravelOS route you opened does not exist.</p>
      <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium">Return to dashboard</Link>
    </Card>
  );
}
