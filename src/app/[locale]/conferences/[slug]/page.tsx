import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Agenda } from "@/components/Agenda";
import { SpeakerCard } from "@/components/SpeakerCard";
import { SponsorGrid } from "@/components/SponsorGrid";
import { countActiveRegistrations, getConferenceBySlug, getSessionsWithSpeakers, getSpeakers, getSponsors, getTracks } from "@/db/queries";
import { isLocale } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";
import { formatDate, formatDateRange, formatMoney, localized } from "@/lib/utils";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale = isLocale(raw) ? raw : "ar";
  const conference = await getConferenceBySlug(slug);
  if (!conference) return {};
  return { title: localized(conference, "title", locale), description: localized(conference, "tagline", locale) };
}

export default async function ConferencePage({ params }: Props) {
  const { locale: raw, slug } = await params;
  const locale = isLocale(raw) ? raw : "ar";
  const dict = getDict(locale);
  const conference = await getConferenceBySlug(slug);
  if (!conference) notFound();
  const [tracks, sessions, speakers, sponsors, registered] = await Promise.all([
    getTracks(conference.id),
    getSessionsWithSpeakers(conference.id),
    getSpeakers(conference.id),
    getSponsors(conference.id),
    countActiveRegistrations(conference.id),
  ]);
  const title = localized(conference, "title", locale);
  const tagline = localized(conference, "tagline", locale);
  const description = localized(conference, "description", locale);
  const venue = localized(conference, "venue", locale);
  const today = new Date().toISOString().slice(0, 10);
  const ended = conference.endDate < today;
  const seatsLeft = conference.capacity > 0 ? Math.max(0, conference.capacity - registered) : null;
  const canRegister = conference.registrationOpen && !ended && (seatsLeft === null || seatsLeft > 0);
  const abstractsOpen = conference.abstractsOpen && (!conference.abstractDeadline || conference.abstractDeadline >= today);
  const base = `/${locale}/conferences/${conference.slug}`;
  const sections = [
    ["about", dict.conference.about],
    ["agenda", dict.conference.agenda],
    ["speakers", dict.conference.speakers],
    ["sponsors", dict.conference.sponsors],
  ] as const;

  return (
    <>
      <section className="hero-gradient relative text-white">
        {conference.heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={conference.heroImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        ) : null}
        <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-24">
          <p className="text-sm font-semibold text-accent-400">{formatDateRange(conference.startDate, conference.endDate, locale)}</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-black leading-tight md:text-5xl">{title}</h1>
          {tagline ? <p className="mt-4 max-w-2xl text-lg text-white/85">{tagline}</p> : null}
          <div className="mt-8 flex flex-wrap gap-3">
            {canRegister ? (
              <Link href={`${base}/register`} className="btn-accent">
                {dict.common.registerNow}
              </Link>
            ) : null}
            {abstractsOpen ? (
              <Link href={`${base}/submit`} className="btn border border-white/40 text-white hover:bg-white/10">
                {dict.common.submitAbstract}
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <div className="sticky top-[57px] z-30 border-b border-slate-200 bg-white/95 backdrop-blur md:top-[65px]">
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4" aria-label="Sections">
          {sections.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="whitespace-nowrap px-3 py-3 text-sm font-medium text-slate-600 hover:text-brand-700">
              {label}
            </a>
          ))}
        </nav>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-3">
        <div className="space-y-14 lg:col-span-2">
          <section id="about" className="scroll-mt-32">
            <h2 className="text-2xl font-bold text-slate-900">{dict.conference.about}</h2>
            <div className="prose-basic mt-4">
              {description ? description.split(/\n{2,}|\r\n\r\n/).map((p, i) => <p key={i}>{p}</p>) : <p className="text-slate-500">{dict.common.none}</p>}
            </div>
          </section>
          <section id="agenda" className="scroll-mt-32">
            <h2 className="mb-4 text-2xl font-bold text-slate-900">{dict.conference.agenda}</h2>
            <Agenda sessions={sessions} tracks={tracks} locale={locale} dict={dict} />
          </section>
          <section id="speakers" className="scroll-mt-32">
            <h2 className="mb-4 text-2xl font-bold text-slate-900">{dict.conference.speakers}</h2>
            {speakers.length === 0 ? (
              <p className="text-slate-600">{dict.conference.noSpeakers}</p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {speakers.map((sp) => (
                  <SpeakerCard key={sp.id} speaker={sp} locale={locale} dict={dict} />
                ))}
              </div>
            )}
          </section>
          <section id="sponsors" className="scroll-mt-32">
            <h2 className="mb-4 text-2xl font-bold text-slate-900">{dict.conference.sponsors}</h2>
            <SponsorGrid sponsors={sponsors} dict={dict} />
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-32 lg:self-start">
          <div className="card p-6">
            <h3 className="text-base font-bold text-slate-900">{dict.conference.registration}</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">{dict.conference.dates}</dt>
                <dd className="text-end font-medium text-slate-800">{formatDateRange(conference.startDate, conference.endDate, locale)}</dd>
              </div>
              {venue || conference.city ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">{dict.conference.venue}</dt>
                  <dd className="text-end font-medium text-slate-800">{[venue, conference.city, conference.country].filter(Boolean).join("، ")}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">{dict.common.price}</dt>
                <dd className="font-medium text-slate-800">{formatMoney(conference.price, conference.currency, locale)}</dd>
              </div>
              {seatsLeft !== null ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">{dict.common.capacity}</dt>
                  <dd className="font-medium text-slate-800">
                    {seatsLeft} {dict.conference.seatsLeft}
                  </dd>
                </div>
              ) : null}
            </dl>
            <p className={`mt-4 text-sm font-semibold ${canRegister ? "text-emerald-700" : "text-slate-500"}`}>
              {ended ? dict.conference.ended : canRegister ? dict.conference.registrationOpen : dict.conference.registrationClosed}
            </p>
            {canRegister ? (
              <Link href={`${base}/register`} className="btn-primary mt-4 w-full">
                {dict.common.registerNow}
              </Link>
            ) : null}
          </div>
          <div className="card p-6">
            <h3 className="text-base font-bold text-slate-900">{dict.conference.abstracts}</h3>
            <p className={`mt-2 text-sm font-semibold ${abstractsOpen ? "text-emerald-700" : "text-slate-500"}`}>{abstractsOpen ? dict.conference.abstractsOpen : dict.conference.abstractsClosed}</p>
            {conference.abstractDeadline ? (
              <p className="mt-1 text-sm text-slate-600">
                {dict.conference.deadline}: {formatDate(conference.abstractDeadline, locale)}
              </p>
            ) : null}
            {abstractsOpen ? (
              <Link href={`${base}/submit`} className="btn-outline mt-4 w-full">
                {dict.common.submitAbstract}
              </Link>
            ) : null}
          </div>
          {conference.website || conference.contactEmail ? (
            <div className="card p-6 text-sm">
              {conference.website ? (
                <p>
                  <a href={conference.website} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline" dir="ltr">
                    {conference.website}
                  </a>
                </p>
              ) : null}
              {conference.contactEmail ? (
                <p className="mt-1">
                  <a href={`mailto:${conference.contactEmail}`} className="text-brand-700 hover:underline" dir="ltr">
                    {conference.contactEmail}
                  </a>
                </p>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>
    </>
  );
}
