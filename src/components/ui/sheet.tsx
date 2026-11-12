import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;

export function SheetContent({
  className,
  children,
  side = "start",
  ...props
}: React.ComponentProps<typeof Dialog.Content> & { side?: "start" | "end" }) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
      <Dialog.Content
        className={cn(
          "fixed inset-y-0 z-50 flex w-[min(20rem,88vw)] flex-col bg-sand p-4 shadow-xl outline-none",
          side === "start" ? "start-0" : "end-0",
          className,
        )}
        {...props}
      >
        <Dialog.Title className="sr-only">Menu</Dialog.Title>
        <Dialog.Close className="absolute end-3 top-3 rounded-md p-2 text-muted hover:bg-sand-2">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </Dialog.Close>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
