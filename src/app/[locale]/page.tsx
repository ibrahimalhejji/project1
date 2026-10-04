import Link from "next/link";
import { ConferenceCard } from "@/components/ConferenceCard";
import { listPublishedConferences, publicStats } from "@/db/queries";
import { isLocale } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "ar";
  const dict = getDict(locale);
  const [conferences, stats] = await Promise.all([listPublishedConferences(), publicStats()]);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = conferences.filter((c) => c.endDate >= today).slice(0, 3);
  const featured = upcoming.length ? upcoming : conferences.slice(-3).reverse();

  return (
    <>
      <section className="hero-gradient text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-5 md:py-28">
          <div className="md:col-span-3">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent-400">{dict.site.tagline}</p>
            <h1 className="mt-3 text-4xl font-black leading-tight md:text-5xl">{dict.home.heroTitle}</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-white/85">{dict.home.heroSubtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/${locale}/conferences`} className="btn-accent">
                {dict.home.browse}
              </Link>
              <Link href={`/${locale}/about`} className="btn border border-white/40 text-white hover:bg-white/10">
                {dict.common.learnMore}
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 self-center md:col-span-2 md:grid-cols-1">
            {[
              [stats.conferences, dict.home.statsConferences],
              [stats.speakers, dict.home.statsSpeakers],
              [stats.registrations, dict.home.statsAttendees],
            ].map(([value, label]) => (
              <div key={String(label)} className="rounded-2xl border border-white/15 bg-white/10 p-4 text-center backdrop-blur md:flex md:items-baseline md:justify-between md:px-6 md:text-start">
                <span className="block text-3xl font-black text-accent-400">{value}</span>
                <span className="text-sm text-white/80">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{dict.home.upcoming}</h2>
            <p className="mt-1 text-slate-600">{dict.home.upcomingSub}</p>
          </div>
          <Link href={`/${locale}/conferences`} className="btn-outline btn-sm">
            {dict.common.viewAll}
          </Link>
        </div>
        {featured.length === 0 ? (
          <p className="card p-8 text-center text-slate-600">{dict.home.noUpcoming}</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {featured.map((conference) => (
              <ConferenceCard key={conference.id} conference={conference} locale={locale} dict={dict} />
            ))}
          </div>
        )}
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-bold text-slate-900">{dict.home.whyTitle}</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {dict.home.features.map((feature, index) => (
              <div key={feature.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">{index + 1}</span>
                <h3 className="mt-4 text-base font-bold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-3xl bg-brand-800 px-6 py-12 text-center text-white md:px-12">
          <h2 className="text-2xl font-bold">{dict.home.ctaTitle}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-white/80">{dict.home.ctaBody}</p>
          <Link href={`/${locale}/admin`} className="btn-accent mt-6">
            {dict.home.ctaButton}
          </Link>
        </div>
      </section>
    </>
  );
}
