import type { Metadata } from "next";
import { ConferenceCard } from "@/components/ConferenceCard";
import { listPublishedConferences } from "@/db/queries";
import { isLocale } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(isLocale(locale) ? locale : "ar").nav.conferences };
}

export default async function ConferencesPage({ params }: Props) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "ar";
  const dict = getDict(locale);
  const conferences = await listPublishedConferences();
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = conferences.filter((c) => c.endDate >= today);
  const past = conferences.filter((c) => c.endDate < today).reverse();
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900">{dict.conference.allConferences}</h1>
      <p className="mt-2 text-slate-600">{dict.conference.listIntro}</p>
      {conferences.length === 0 ? <p className="card mt-8 p-8 text-center text-slate-600">{dict.home.noUpcoming}</p> : null}
      {upcoming.length ? (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold text-slate-900">{dict.home.upcoming}</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((c) => (
              <ConferenceCard key={c.id} conference={c} locale={locale} dict={dict} />
            ))}
          </div>
        </section>
      ) : null}
      {past.length ? (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold text-slate-900">{dict.conference.past}</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {past.map((c) => (
              <ConferenceCard key={c.id} conference={c} locale={locale} dict={dict} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
