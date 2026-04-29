import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-4 dark:bg-slate-950">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6">
          <div className="mb-4 grid size-10 place-items-center rounded-md bg-slate-950 text-sm font-bold text-white dark:bg-white dark:text-slate-950">TO</div>
          <h1 className="text-2xl font-semibold">Sign in to TravelOS CRM</h1>
          <p className="mt-2 text-sm text-slate-500">Use demo admin, staff, or agent credentials after seeding.</p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
