import type { Metadata } from "next";
import { isLocale } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(isLocale(locale) ? locale : "ar").nav.about };
}

export default async function AboutPage({ params }: Props) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "ar";
  const dict = getDict(locale);
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900">{dict.about.title}</h1>
      <p className="mt-4 text-lg leading-8 text-slate-700">{dict.about.lead}</p>
      <div className="prose-basic mt-6">
        {dict.about.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      <div className="mt-10 rounded-3xl bg-brand-50 p-8">
        <h2 className="text-lg font-bold text-brand-800">{dict.about.missionTitle}</h2>
        <p className="mt-2 text-brand-900">{dict.about.mission}</p>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {dict.home.features.map((f) => (
          <div key={f.title} className="card p-5">
            <h3 className="font-semibold text-slate-900">{f.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{f.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
