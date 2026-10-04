import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries";
import type { CurrentUser } from "@/lib/auth";
import { logout } from "@/actions/auth";
import { Logo } from "./Logo";
import { LocaleSwitcher } from "./LocaleSwitcher";

export function Header({ locale, dict, user }: { locale: Locale; dict: Dict; user: CurrentUser | null }) {
  const links = [
    { href: `/${locale}`, label: dict.nav.home },
    { href: `/${locale}/conferences`, label: dict.nav.conferences },
    { href: `/${locale}/speakers`, label: dict.nav.speakers },
    { href: `/${locale}/about`, label: dict.nav.about },
    { href: `/${locale}/support`, label: dict.nav.support },
    { href: `/${locale}/contact`, label: dict.nav.contact },
  ];
  const isAdmin = !!user && ["admin", "organizer"].includes(user.role);
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href={`/${locale}`} className="flex items-center" aria-label={dict.site.name}>
          <Logo tagline={dict.site.tagline} />
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-brand-700">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <LocaleSwitcher locale={locale} label={dict.nav.switchLocale} />
          {isAdmin ? (
            <>
              <Link href={`/${locale}/admin`} className="btn-primary btn-sm">
                {dict.nav.admin}
              </Link>
              <form action={logout}>
                <input type="hidden" name="locale" value={locale} />
                <button type="submit" className="btn-ghost btn-sm">
                  {dict.nav.logout}
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href={`/${locale}/login`} className="btn-outline btn-sm">
                {dict.nav.login}
              </Link>
              <Link href={`/${locale}/signup`} className="btn-accent btn-sm hidden sm:inline-flex">
                {dict.nav.signup}
              </Link>
            </>
          )}
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-2 py-1.5 md:hidden" aria-label="Main mobile">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
