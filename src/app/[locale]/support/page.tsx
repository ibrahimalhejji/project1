import type { Metadata } from "next";
import { ContactForm } from "@/components/forms/ContactForm";
import { isLocale } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(isLocale(locale) ? locale : "ar").support.title };
}

export default async function SupportPage({ params }: Props) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "ar";
  const dict = getDict(locale);
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900">{dict.support.title}</h1>
      <p className="mt-2 text-slate-600">{dict.support.intro}</p>
      <div className="mt-10 grid gap-10 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <h2 className="mb-4 text-xl font-bold text-slate-900">{dict.support.faqTitle}</h2>
          <div className="space-y-3">
            {dict.support.faq.map((item) => (
              <details key={item.q} className="card group p-5">
                <summary className="cursor-pointer list-none font-semibold text-slate-900 marker:content-none">
                  <span className="me-2 text-brand-500">?</span>
                  {item.q}
                </summary>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="lg:col-span-2">
          <h2 className="mb-4 text-xl font-bold text-slate-900">{dict.support.formTitle}</h2>
          <ContactForm locale={locale} dict={dict} category="support" submitLabel={dict.support.submit} />
        </section>
      </div>
    </div>
  );
}
