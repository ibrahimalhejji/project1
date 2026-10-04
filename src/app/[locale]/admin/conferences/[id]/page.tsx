import { notFound } from "next/navigation";
import { deleteConference, setConferenceStatus } from "@/actions/conferences";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { ConferenceForm } from "@/components/forms/ConferenceForm";
import { getConferenceById } from "@/db/queries";
import { isLocale } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";

export default async function EditConferencePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: raw, id } = await params;
  const locale = isLocale(raw) ? raw : "ar";
  const dict = getDict(locale);
  const conference = await getConferenceById(Number(id));
  if (!conference) notFound();
  return (
    <>
      <div className="mb-6 flex flex-wrap gap-2">
        {conference.status !== "published" ? (
          <form action={setConferenceStatus}>
            <input type="hidden" name="id" value={conference.id} />
            <input type="hidden" name="status" value="published" />
            <button type="submit" className="btn-primary btn-sm">{dict.admin.publish}</button>
          </form>
        ) : (
          <form action={setConferenceStatus}>
            <input type="hidden" name="id" value={conference.id} />
            <input type="hidden" name="status" value="draft" />
            <button type="submit" className="btn-outline btn-sm">{dict.admin.unpublish}</button>
          </form>
        )}
        {conference.status !== "archived" ? (
          <form action={setConferenceStatus}>
            <input type="hidden" name="id" value={conference.id} />
            <input type="hidden" name="status" value="archived" />
            <button type="submit" className="btn-ghost btn-sm">{dict.admin.archive}</button>
          </form>
        ) : null}
        <form action={deleteConference} className="ms-auto">
          <input type="hidden" name="id" value={conference.id} />
          <input type="hidden" name="locale" value={locale} />
          <ConfirmButton message={dict.admin.confirmDelete}>{dict.common.delete}</ConfirmButton>
        </form>
      </div>
      <ConferenceForm locale={locale} dict={dict} conference={conference} />
    </>
  );
}
