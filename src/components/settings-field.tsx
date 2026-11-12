import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-subtle">{hint}</p> : null}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  type = "text",
  disabled,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  hint?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <Field label={label} hint={hint}>
      <Input type={type} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

export function AreaField({
  label,
  value,
  onChange,
  hint,
  dir,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  dir?: "ltr" | "rtl";
  disabled?: boolean;
}) {
  return (
    <Field label={label} hint={hint}>
      <Textarea dir={dir} value={value} disabled={disabled} rows={4} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}
