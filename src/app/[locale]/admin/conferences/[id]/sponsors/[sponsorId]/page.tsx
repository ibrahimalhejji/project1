import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/PageHeader";
import { SponsorForm } from "@/components/forms/SponsorForm";
import { getConferenceById, getSponsorById } from "@/db/queries";
import { isLocale } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";

export default async function EditSponsorPage({ params }: { params: Promise<{ locale: string; id: string; sponsorId: string }> }) {
  const { locale: raw, id, sponsorId } = await params;
  const locale = isLocale(raw) ? raw : "ar";
  const dict = getDict(locale);
  const conference = await getConferenceById(Number(id));
  if (!conference) notFound();
  const sponsor = await getSponsorById(Number(sponsorId));
  if (!sponsor || sponsor.conferenceId !== conference.id) notFound();
  return (
    <>
      <PageHeader title={dict.admin.editSponsor} />
      <SponsorForm locale={locale} dict={dict} conferenceId={conference.id} sponsor={sponsor} />
    </>
  );
}
