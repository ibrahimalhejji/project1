import Link from "next/link";
import type { Conference } from "@/db/schema";
import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries";
import { formatDateRange, localized } from "@/lib/utils";

export function ConferenceCard({ conference, locale, dict }: { conference: Conference; locale: Locale; dict: Dict }) {
  const title = localized(conference, "title", locale);
  const tagline = localized(conference, "tagline", locale);
  const venue = localized(conference, "venue", locale);
  const today = new Date().toISOString().slice(0, 10);
  const ended = conference.endDate < today;
  return (
    <Link href={`/${locale}/conferences/${conference.slug}`} className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="hero-gradient relative h-36">
        {conference.heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={conference.heroImage} alt="" className="h-full w-full object-cover" />
        ) : null}
        <span className="absolute start-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-brand-800">
          {ended ? dict.conference.ended : conference.registrationOpen ? dict.conference.registrationOpen : dict.conference.upcoming}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold text-slate-900 group-hover:text-brand-700">{title}</h3>
        {tagline ? <p className="mt-1 line-clamp-2 text-sm text-slate-600">{tagline}</p> : null}
        <dl className="mt-4 space-y-1 text-sm text-slate-600">
          <div className="flex gap-2">
            <dt className="font-medium text-slate-800">{dict.conference.dates}:</dt>
            <dd>{formatDateRange(conference.startDate, conference.endDate, locale)}</dd>
          </div>
          {venue || conference.city ? (
            <div className="flex gap-2">
              <dt className="font-medium text-slate-800">{dict.conference.venue}:</dt>
              <dd>{[venue, conference.city].filter(Boolean).join("، ")}</dd>
            </div>
          ) : null}
        </dl>
        <span className="mt-auto pt-4 text-sm font-semibold text-brand-700">{dict.common.readMore} →</span>
      </div>
    </Link>
  );
}
