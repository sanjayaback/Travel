"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      toast.error("Invalid email or password");
      return;
    }
    toast.success("Welcome back");
    router.push(params.get("callbackUrl") ?? "/dashboard");
    router.refresh();
  }

  return (
    <form action={submit} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Email</span>
        <input name="email" type="email" defaultValue="admin@travelos.com" required className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-slate-500 dark:border-slate-800 dark:bg-slate-950" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Password</span>
        <input name="password" type="password" defaultValue="password123" required className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-slate-500 dark:border-slate-800 dark:bg-slate-950" />
      </label>
      <Button className="w-full" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Button>
      <div className="flex justify-between text-sm text-slate-500">
        <Link href="/register" className="hover:text-slate-950 dark:hover:text-white">Create agency</Link>
        <span>Forgot password ready</span>
      </div>
    </form>
  );
}
