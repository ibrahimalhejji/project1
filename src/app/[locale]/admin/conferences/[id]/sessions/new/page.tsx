import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/PageHeader";
import { SessionForm } from "@/components/forms/SessionForm";
import { getConferenceById, getSpeakers, getTracks } from "@/db/queries";
import { isLocale } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";

export default async function NewSessionPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: raw, id } = await params;
  const locale = isLocale(raw) ? raw : "ar";
  const dict = getDict(locale);
  const conference = await getConferenceById(Number(id));
  if (!conference) notFound();
  const [tracks, speakers] = await Promise.all([getTracks(conference.id), getSpeakers(conference.id)]);
  return (
    <>
      <PageHeader title={dict.admin.newSession} />
      <SessionForm locale={locale} dict={dict} conferenceId={conference.id} tracks={tracks} speakers={speakers} defaultDay={conference.startDate} minDay={conference.startDate} maxDay={conference.endDate} />
    </>
  );
}
