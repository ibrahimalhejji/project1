import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries";
import { Logo } from "./Logo";

export function Footer({ locale, dict }: { locale: Locale; dict: Dict }) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <Logo tagline={dict.site.tagline} markClass="h-9 w-9" />
          <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">{dict.site.description}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{dict.footer.links}</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><Link href={`/${locale}/conferences`} className="hover:text-brand-700">{dict.nav.conferences}</Link></li>
            <li><Link href={`/${locale}/speakers`} className="hover:text-brand-700">{dict.nav.speakers}</Link></li>
            <li><Link href={`/${locale}/about`} className="hover:text-brand-700">{dict.nav.about}</Link></li>
            <li><Link href={`/${locale}/support`} className="hover:text-brand-700">{dict.nav.support}</Link></li>
            <li><Link href={`/${locale}/contact`} className="hover:text-brand-700">{dict.nav.contact}</Link></li>
            <li><Link href={`/${locale}/signup`} className="hover:text-brand-700">{dict.nav.signup}</Link></li>
            <li><Link href={`/${locale}/login`} className="hover:text-brand-700">{dict.nav.login}</Link></li>
          </ul>
        </div>
        <div className="text-sm text-slate-600">
          <h3 className="text-sm font-semibold text-slate-900">{dict.footer.platform}</h3>
          <p className="mt-3">cmchub.net</p>
          <p className="mt-1 text-xs text-slate-500">{dict.footer.builtOn}</p>
        </div>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-500">
        © {year} {dict.site.name}. {dict.footer.rights}
      </div>
    </footer>
  );
}
