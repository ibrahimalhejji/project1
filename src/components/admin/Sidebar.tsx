"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries";
import { cn } from "@/lib/utils";

export function Sidebar({ locale, dict, unread, role }: { locale: Locale; dict: Dict; unread: number; role: string }) {
  const pathname = usePathname();
  const base = `/${locale}/admin`;
  const items = [
    { href: base, label: dict.admin.dashboard, exact: true },
    { href: `${base}/conferences`, label: dict.admin.conferences },
    ...(role === "admin"
      ? [
          { href: `${base}/messages`, label: dict.admin.messages, badge: unread },
          { href: `${base}/users`, label: dict.admin.users },
        ]
      : []),
  ];
  return (
    <aside className="w-full shrink-0 md:w-56">
      <nav className="flex gap-1 overflow-x-auto md:flex-col" aria-label="Admin">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium transition",
                active ? "bg-brand-600 text-white" : "text-slate-700 hover:bg-slate-100",
              )}
            >
              <span>{item.label}</span>
              {item.badge ? <span className={cn("badge", active ? "bg-white/20 text-white" : "bg-accent-400 text-brand-900")}>{item.badge}</span> : null}
            </Link>
          );
        })}
        <Link href={`/${locale}`} className="rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100">
          ← {dict.admin.viewSite}
        </Link>
      </nav>
    </aside>
  );
}
