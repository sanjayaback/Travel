import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-4 dark:bg-slate-950">
      <section className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6">
          <div className="mb-4 grid size-10 place-items-center rounded-md bg-slate-950 text-sm font-bold text-white dark:bg-white dark:text-slate-950">TO</div>
          <h1 className="text-2xl font-semibold">Create your agency workspace</h1>
          <p className="mt-2 text-sm text-slate-500">Self-service onboarding is scaffolded for production. Use the seed command for demo access today.</p>
        </div>
        <form className="grid gap-4 sm:grid-cols-2">
          {["Agency name", "Admin name", "Email", "Phone"].map((label) => (
            <label key={label}>
              <span className="mb-1 block text-sm font-medium">{label}</span>
              <input className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm dark:border-slate-800 dark:bg-slate-950" />
            </label>
          ))}
          <Button className="sm:col-span-2" type="button">Request workspace</Button>
        </form>
        <Link href="/login" className="mt-4 block text-sm text-slate-500 hover:text-slate-950 dark:hover:text-white">Back to login</Link>
      </section>
    </main>
  );
}
