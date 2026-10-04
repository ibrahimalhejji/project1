import Link from "next/link";
import { notFound } from "next/navigation";
import { RegisterForm } from "@/components/forms/RegisterForm";
import { countActiveRegistrations, getConferenceBySlug } from "@/db/queries";
import { isLocale } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";
import { formatDateRange, localized } from "@/lib/utils";

export default async function RegisterPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: raw, slug } = await params;
  const locale = isLocale(raw) ? raw : "ar";
  const dict = getDict(locale);
  const conference = await getConferenceBySlug(slug);
  if (!conference) notFound();
  const today = new Date().toISOString().slice(0, 10);
  const registered = await countActiveRegistrations(conference.id);
  const full = conference.capacity > 0 && registered >= conference.capacity;
  const open = conference.registrationOpen && conference.endDate >= today && !full;
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href={`/${locale}/conferences/${conference.slug}`} className="text-sm text-brand-700 hover:underline">
        ← {localized(conference, "title", locale)}
      </Link>
      <h1 className="mt-3 text-3xl font-bold text-slate-900">
        {dict.register.title} {localized(conference, "title", locale)}
      </h1>
      <p className="mt-1 text-slate-500">{formatDateRange(conference.startDate, conference.endDate, locale)}</p>
      <p className="mt-4 text-slate-600">{dict.register.intro}</p>
      <div className="mt-8">
        {open ? <RegisterForm locale={locale} dict={dict} conferenceId={conference.id} /> : <p className="card p-8 text-center text-slate-600">{full ? dict.register.full : dict.register.closed}</p>}
      </div>
    </div>
  );
}
