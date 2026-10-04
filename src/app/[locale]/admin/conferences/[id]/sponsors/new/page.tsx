import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/PageHeader";
import { SponsorForm } from "@/components/forms/SponsorForm";
import { getConferenceById } from "@/db/queries";
import { isLocale } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";

export default async function NewSponsorPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: raw, id } = await params;
  const locale = isLocale(raw) ? raw : "ar";
  const dict = getDict(locale);
  const conference = await getConferenceById(Number(id));
  if (!conference) notFound();
  return (
    <>
      <PageHeader title={dict.admin.newSponsor} />
      <SponsorForm locale={locale} dict={dict} conferenceId={conference.id} />
    </>
  );
}
