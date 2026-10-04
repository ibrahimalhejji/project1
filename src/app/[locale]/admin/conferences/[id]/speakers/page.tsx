import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteSpeaker } from "@/actions/speakers";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { PageHeader } from "@/components/admin/PageHeader";
import { SpeakerAvatar } from "@/components/SpeakerCard";
import { getConferenceById, getSpeakers } from "@/db/queries";
import { isLocale } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";
import { localized } from "@/lib/utils";

export default async function SpeakersAdminPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: raw, id } = await params;
  const locale = isLocale(raw) ? raw : "ar";
  const dict = getDict(locale);
  const conference = await getConferenceById(Number(id));
  if (!conference) notFound();
  const speakers = await getSpeakers(conference.id);
  const base = `/${locale}/admin/conferences/${conference.id}`;
  return (
    <>
      <PageHeader
        title={dict.admin.speakers}
        actions={
          <Link href={`${base}/speakers/new`} className="btn-primary">
            + {dict.admin.newSpeaker}
          </Link>
        }
      />
      {speakers.length === 0 ? (
        <p className="card p-8 text-center text-slate-500">{dict.common.none}</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th></th>
                <th>{dict.common.name}</th>
                <th>{dict.common.jobTitle}</th>
                <th>{dict.common.organization}</th>
                <th>{dict.conference.keynote}</th>
                <th>{dict.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {speakers.map((sp) => (
                <tr key={sp.id}>
                  <td className="w-12"><SpeakerAvatar speaker={sp} locale={locale} size="h-10 w-10" /></td>
                  <td>
                    <Link href={`${base}/speakers/${sp.id}`} className="font-medium text-slate-900 hover:text-brand-700">{localized(sp, "name", locale)}</Link>
                    <p className="text-xs text-slate-500" dir="ltr">{sp.email}</p>
                  </td>
                  <td>{localized(sp, "jobTitle", locale) || "—"}</td>
                  <td>{sp.organization || "—"}</td>
                  <td>{sp.isKeynote ? dict.common.yes : dict.common.no}</td>
                  <td className="whitespace-nowrap">
                    <Link href={`${base}/speakers/${sp.id}`} className="btn-outline btn-sm">{dict.common.edit}</Link>{" "}
                    <form action={deleteSpeaker} className="inline">
                      <input type="hidden" name="id" value={sp.id} />
                      <ConfirmButton message={dict.admin.confirmDelete}>{dict.common.delete}</ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
