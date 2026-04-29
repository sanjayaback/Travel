import { z } from "zod";
import type { ModuleConfig, ModuleField } from "@/lib/modules";

export class ValidationError extends Error {
  status = 400;
  details: Record<string, string>;

  constructor(details: Record<string, string>) {
    super("Validation failed");
    this.details = details;
  }
}

function fieldSchema(field: ModuleField) {
  let schema: z.ZodType<unknown>;

  if (field.type === "email") {
    schema = z.string().email("Enter a valid email address");
  } else if (field.type === "number") {
    schema = z
      .string()
      .regex(/^-?\d+(\.\d{1,2})?$/, "Enter a valid amount")
      .refine((value) => Number.isFinite(Number(value)), "Enter a valid number");
  } else if (field.type === "date" || field.type === "datetime-local") {
    schema = z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), "Enter a valid date");
  } else if (field.type === "select" && field.options?.length) {
    schema = z.string().min(1, `${field.label} is required`).refine((value) => field.options?.includes(value), "Select a valid option");
  } else {
    schema = z.string().max(5000, "Value is too long");
  }

  if (!field.required) {
    return z.preprocess((value) => (value === "" ? undefined : value), schema.optional());
  }

  const requiredSchema = field.type === "text" || !field.type || field.type === "textarea" || field.relation ? z.string().min(1, `${field.label} is required`).and(schema as z.ZodString) : schema;
  return z.preprocess((value) => (typeof value === "string" ? value.trim() : value), requiredSchema);
}

function coerceParsedValue(field: ModuleField, value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (field.type === "date" || field.type === "datetime-local") return new Date(String(value));
  return String(value).trim();
}

export function parseModuleForm(config: ModuleConfig, formData: FormData) {
  const shape = Object.fromEntries(config.fields.map((field) => [field.name, fieldSchema(field)]));
  const raw = Object.fromEntries(config.fields.map((field) => [field.name, formData.get(field.name) ?? ""]));
  const parsed = z.object(shape).safeParse(raw);

  if (!parsed.success) {
    const details: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      details[key] = issue.message;
    }
    throw new ValidationError(details);
  }

  const data: Record<string, unknown> = {};
  for (const field of config.fields) {
    const value = coerceParsedValue(field, parsed.data[field.name]);
    if (value !== undefined) data[field.name] = value;
  }
  return data;
}
