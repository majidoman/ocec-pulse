import type { ReactNode } from "react";

export function PageFrame({
  title,
  hint,
  children,
  actions,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 pb-20 md:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-2xl flex-col gap-1">
          <h1 className="font-display text-2xl font-medium tracking-tight text-ink md:text-3xl">{title}</h1>
          {hint ? <p className="text-sm leading-relaxed text-muted">{hint}</p> : null}
        </div>
        {actions}
      </header>
      {children}
    </div>
  );
}
