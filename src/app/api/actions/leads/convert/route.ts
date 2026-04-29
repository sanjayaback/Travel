import { NextResponse } from "next/server";
import { convertLeadToCustomer } from "@/lib/module-service";

export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Lead id is required" }, { status: 400 });
    const customer = await convertLeadToCustomer(String(id));
    return NextResponse.json({ customer });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to convert lead";
    return NextResponse.json({ error: message }, { status: message.includes("access") ? 403 : 500 });
  }
}
