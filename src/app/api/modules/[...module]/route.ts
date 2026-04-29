import { NextResponse } from "next/server";
import { createRecord, deleteRecord, exportRecords, updateRecord } from "@/lib/module-service";
import { ValidationError } from "@/lib/validation";

function keyFrom(params: { module: string[] }) {
  return params.module.join("/");
}

export async function POST(request: Request, context: { params: Promise<{ module: string[] }> }) {
  try {
    const params = await context.params;
    const formData = await request.formData();
    const record = await createRecord(keyFrom(params), formData);
    return NextResponse.json({ record });
  } catch (error) {
    return moduleError(error);
  }
}

export async function GET(request: Request, context: { params: Promise<{ module: string[] }> }) {
  try {
    const params = await context.params;
    const url = new URL(request.url);
    const csv = await exportRecords(keyFrom(params), {
      query: url.searchParams.get("q") ?? "",
      status: url.searchParams.get("status") ?? "",
    });
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${keyFrom(params).replace(/\//g, "-")}.csv"`,
      },
    });
  } catch (error) {
    return moduleError(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ module: string[] }> }) {
  try {
    const params = await context.params;
    const formData = await request.formData();
    const id = String(formData.get("id") ?? "");
    await updateRecord(keyFrom(params), id, formData);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return moduleError(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ module: string[] }> }) {
  try {
    const params = await context.params;
    const { id } = await request.json();
    await deleteRecord(keyFrom(params), id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return moduleError(error);
  }
}

function moduleError(error: unknown) {
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message, details: error.details }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Unexpected module error";
  const status = message.includes("access denied") ? 403 : 500;
  return NextResponse.json({ error: message }, { status });
}
