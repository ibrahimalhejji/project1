import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { dir, isLocale, locales } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDict(isLocale(locale) ? locale : "ar");
  return {
    title: { default: `${dict.site.name} · ${dict.site.tagline}`, template: `%s · ${dict.site.name}` },
    description: dict.site.description,
    alternates: { languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])) },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDict(locale);
  const user = await getCurrentUser();
  return (
    <html lang={locale} dir={dir(locale)}>
      <body className="flex min-h-screen flex-col">
        <Header locale={locale} dict={dict} user={user} />
        <main className="flex-1">{children}</main>
        <Footer locale={locale} dict={dict} />
      </body>
    </html>
  );
}
