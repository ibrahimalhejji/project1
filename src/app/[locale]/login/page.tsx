import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/forms/LoginForm";
import { Logo } from "@/components/Logo";
import { isLocale } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/auth";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(isLocale(locale) ? locale : "ar").login.title };
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale: raw } = await params;
  const { next } = await searchParams;
  const locale = isLocale(raw) ? raw : "ar";
  const dict = getDict(locale);
  const user = await getCurrentUser();
  if (user && ["admin", "organizer"].includes(user.role)) redirect(`/${locale}/admin`);
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card p-8">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <h1 className="text-xl font-bold text-slate-900">{dict.login.title}</h1>
            <p className="text-sm text-slate-500">{dict.login.intro}</p>
          </div>
        </div>
        <div className="mt-6">
          <LoginForm locale={locale} dict={dict} next={next && next.startsWith(`/${locale}/`) ? next : `/${locale}/admin`} />
        </div>
      </div>
    </div>
  );
}
