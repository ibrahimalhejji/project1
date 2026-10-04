import Link from "next/link";
import { notFound } from "next/navigation";
import { AbstractForm } from "@/components/forms/AbstractForm";
import { getConferenceBySlug } from "@/db/queries";
import { isLocale } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";
import { formatDate, localized } from "@/lib/utils";

export default async function SubmitAbstractPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: raw, slug } = await params;
  const locale = isLocale(raw) ? raw : "ar";
  const dict = getDict(locale);
  const conference = await getConferenceBySlug(slug);
  if (!conference) notFound();
  const today = new Date().toISOString().slice(0, 10);
  const open = conference.abstractsOpen && (!conference.abstractDeadline || conference.abstractDeadline >= today);
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href={`/${locale}/conferences/${conference.slug}`} className="text-sm text-brand-700 hover:underline">
        ← {localized(conference, "title", locale)}
      </Link>
      <h1 className="mt-3 text-3xl font-bold text-slate-900">
        {dict.abstract.title} {localized(conference, "title", locale)}
      </h1>
      {conference.abstractDeadline ? (
        <p className="mt-1 text-slate-500">
          {dict.conference.deadline}: {formatDate(conference.abstractDeadline, locale)}
        </p>
      ) : null}
      <p className="mt-4 text-slate-600">{dict.abstract.intro}</p>
      <div className="mt-8">{open ? <AbstractForm locale={locale} dict={dict} conferenceId={conference.id} /> : <p className="card p-8 text-center text-slate-600">{dict.abstract.closed}</p>}</div>
    </div>
  );
}
