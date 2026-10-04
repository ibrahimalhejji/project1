import type { Metadata } from "next";
import { ContactForm } from "@/components/forms/ContactForm";
import { isLocale } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(isLocale(locale) ? locale : "ar").contact.title };
}

export default async function ContactPage({ params }: Props) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "ar";
  const dict = getDict(locale);
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900">{dict.contact.title}</h1>
      <p className="mt-2 text-slate-600">{dict.contact.intro}</p>
      <div className="mt-8">
        <ContactForm locale={locale} dict={dict} />
      </div>
    </div>
  );
}
