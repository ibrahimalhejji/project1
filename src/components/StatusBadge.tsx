import type { Dict } from "@/i18n/dictionaries";
import { cn } from "@/lib/utils";

const colors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  published: "bg-emerald-100 text-emerald-800",
  archived: "bg-amber-100 text-amber-800",
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-700",
  attended: "bg-sky-100 text-sky-800",
  submitted: "bg-slate-100 text-slate-700",
  under_review: "bg-sky-100 text-sky-800",
  accepted: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
};

export function StatusBadge({ status, dict }: { status: string; dict: Dict }) {
  const label = (dict.admin.statuses as Record<string, string>)[status] ?? status;
  return <span className={cn("badge", colors[status] ?? "bg-slate-100 text-slate-700")}>{label}</span>;
}
