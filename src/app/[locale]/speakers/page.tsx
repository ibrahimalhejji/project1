import type { Metadata } from "next";
import { SpeakerCard } from "@/components/SpeakerCard";
import { listPublishedSpeakers } from "@/db/queries";
import { isLocale } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";
import { localized } from "@/lib/utils";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(isLocale(locale) ? locale : "ar").speakersPage.title };
}

export default async function SpeakersPage({ params }: Props) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "ar";
  const dict = getDict(locale);
  const rows = await listPublishedSpeakers();
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900">{dict.speakersPage.title}</h1>
      <p className="mt-2 text-slate-600">{dict.speakersPage.intro}</p>
      {rows.length === 0 ? (
        <p className="card mt-8 p-8 text-center text-slate-600">{dict.conference.noSpeakers}</p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ speaker, conference }) => (
            <SpeakerCard key={speaker.id} speaker={speaker} locale={locale} dict={dict} subtitle={localized(conference, "title", locale)} />
          ))}
        </div>
      )}
    </div>
  );
}
