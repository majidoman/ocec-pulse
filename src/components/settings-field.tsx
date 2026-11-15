import { useId, type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function Field({
  label,
  hint,
  children,
  htmlFor,
  hintId,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  /** id of the control, so the label is announced by screen readers and clicking it focuses the field. */
  htmlFor?: string;
  hintId?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? (
        <p id={hintId} className="text-xs text-subtle">
          {hint}
        </p>
      ) : null}
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
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id} hintId={`${id}-hint`}>
      <Input
        id={id}
        type={type}
        value={value}
        disabled={disabled}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
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
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id} hintId={`${id}-hint`}>
      <Textarea
        id={id}
        dir={dir}
        value={value}
        disabled={disabled}
        rows={4}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}
