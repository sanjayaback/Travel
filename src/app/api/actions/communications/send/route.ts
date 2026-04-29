import { NextResponse } from "next/server";
import { sendRecordCommunication } from "@/lib/module-service";

export async function POST(request: Request) {
  try {
    const { module, id, channel } = await request.json();
    if (!module || !id || !channel) {
      return NextResponse.json({ error: "Module, record id, and channel are required" }, { status: 400 });
    }
    const result = await sendRecordCommunication(String(module), String(id), channel);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send communication";
    return NextResponse.json({ error: message }, { status: message.includes("access denied") ? 403 : 500 });
  }
}
