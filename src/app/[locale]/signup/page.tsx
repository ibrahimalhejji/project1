import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/forms/SignupForm";
import { LogoMark } from "@/components/Logo";
import { isLocale } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/auth";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(isLocale(locale) ? locale : "ar").nav.signup };
}

export default async function SignupPage({ params }: Props) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "ar";
  const dict = getDict(locale);
  const user = await getCurrentUser();
  if (user && ["admin", "organizer"].includes(user.role)) redirect(`/${locale}/admin/conferences/new`);
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-14 md:grid-cols-5">
      <div className="md:col-span-2">
        <LogoMark className="h-16 w-16" />
        <h1 className="mt-4 text-3xl font-bold text-slate-900">{dict.signup.title}</h1>
        <p className="mt-3 text-slate-600">{dict.signup.intro}</p>
        <ol className="mt-8 space-y-4">
          {dict.signup.steps.map((step, index) => (
            <li key={step} className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">{index + 1}</span>
              <span className="font-medium text-slate-800">{step}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="card p-6 md:col-span-3 md:p-8">
        <SignupForm locale={locale} dict={dict} />
      </div>
    </div>
  );
}
