"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries";
import type { ConferenceCounts } from "@/db/queries";
import { cn } from "@/lib/utils";

export function ConferenceTabs({ locale, dict, conferenceId, counts }: { locale: Locale; dict: Dict; conferenceId: number; counts: ConferenceCounts }) {
  const pathname = usePathname();
  const base = `/${locale}/admin/conferences/${conferenceId}`;
  const tabs = [
    { href: base, label: dict.admin.editConference, exact: true },
    { href: `${base}/sessions`, label: dict.admin.sessions, count: counts.sessions },
    { href: `${base}/speakers`, label: dict.admin.speakers, count: counts.speakers },
    { href: `${base}/registrations`, label: dict.admin.registrations, count: counts.registrations },
    { href: `${base}/abstracts`, label: dict.admin.abstracts, count: counts.abstracts },
    { href: `${base}/sponsors`, label: dict.admin.sponsors, count: counts.sponsors },
  ];
  return (
    <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition",
              active ? "border-brand-600 text-brand-700" : "border-transparent text-slate-600 hover:text-slate-900",
            )}
          >
            {tab.label}
            {typeof tab.count === "number" ? <span className="ms-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{tab.count}</span> : null}
          </Link>
        );
      })}
    </div>
  );
}
