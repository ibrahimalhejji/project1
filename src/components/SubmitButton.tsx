"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

export function SubmitButton({ children, pendingLabel, className = "btn-primary" }: { children: React.ReactNode; pendingLabel?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={cn(className)} disabled={pending} aria-busy={pending}>
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
