import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/PageHeader";
import { SpeakerForm } from "@/components/forms/SpeakerForm";
import { getConferenceById, getSpeakerById } from "@/db/queries";
import { isLocale } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";

export default async function EditSpeakerPage({ params }: { params: Promise<{ locale: string; id: string; speakerId: string }> }) {
  const { locale: raw, id, speakerId } = await params;
  const locale = isLocale(raw) ? raw : "ar";
  const dict = getDict(locale);
  const conference = await getConferenceById(Number(id));
  if (!conference) notFound();
  const speaker = await getSpeakerById(Number(speakerId));
  if (!speaker || speaker.conferenceId !== conference.id) notFound();
  return (
    <>
      <PageHeader title={dict.admin.editSpeaker} />
      <SpeakerForm locale={locale} dict={dict} conferenceId={conference.id} speaker={speaker} />
    </>
  );
}
