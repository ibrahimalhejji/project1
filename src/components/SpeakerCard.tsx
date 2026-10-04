import type { Speaker } from "@/db/schema";
import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries";
import { localized } from "@/lib/utils";

export function SpeakerAvatar({ speaker, locale, size = "h-20 w-20" }: { speaker: Speaker; locale: Locale; size?: string }) {
  const name = localized(speaker, "name", locale);
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
  return speaker.photoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={speaker.photoUrl} alt={name} className={`${size} rounded-full object-cover ring-2 ring-brand-100`} />
  ) : (
    <div className={`${size} flex items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700 ring-2 ring-brand-100`}>{initials}</div>
  );
}

export function SpeakerCard({ speaker, locale, dict, subtitle }: { speaker: Speaker; locale: Locale; dict: Dict; subtitle?: string }) {
  const name = localized(speaker, "name", locale);
  const jobTitle = localized(speaker, "jobTitle", locale);
  const bio = localized(speaker, "bio", locale);
  return (
    <article className="card flex flex-col items-center p-6 text-center">
      <SpeakerAvatar speaker={speaker} locale={locale} />
      <h3 className="mt-4 text-base font-bold text-slate-900">{name}</h3>
      {speaker.isKeynote ? <span className="badge mt-1 bg-accent-400/30 text-brand-900">{dict.conference.keynote}</span> : null}
      {jobTitle ? <p className="mt-1 text-sm text-slate-600">{jobTitle}</p> : null}
      {speaker.organization ? <p className="text-xs text-slate-500">{speaker.organization}</p> : null}
      {subtitle ? <p className="mt-1 text-xs text-brand-700">{subtitle}</p> : null}
      {bio ? <p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-600">{bio}</p> : null}
      <div className="mt-3 flex gap-3 text-xs text-brand-700">
        {speaker.website ? <a href={speaker.website} target="_blank" rel="noreferrer" className="hover:underline">{dict.common.website}</a> : null}
        {speaker.linkedin ? <a href={speaker.linkedin} target="_blank" rel="noreferrer" className="hover:underline">{dict.common.linkedin}</a> : null}
        {speaker.twitter ? <a href={speaker.twitter} target="_blank" rel="noreferrer" className="hover:underline">{dict.common.twitter}</a> : null}
      </div>
    </article>
  );
}
