"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { otherLocale, type Locale } from "@/i18n/config";

export function LocaleSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname() || `/${locale}`;
  const target = otherLocale(locale);
  const rest = pathname.replace(/^\/(ar|en)(?=\/|$)/, "");
  return (
    <Link href={`/${target}${rest || ""}`} className="btn-ghost btn-sm" hrefLang={target} lang={target}>
      {label}
    </Link>
  );
}
