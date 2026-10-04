import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteSession, deleteTrack, saveTrack } from "@/actions/sessions";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { PageHeader } from "@/components/admin/PageHeader";
import { getConferenceById, getSessionsWithSpeakers, getTracks } from "@/db/queries";
import { isLocale } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";
import { formatDate, localized } from "@/lib/utils";

export default async function SessionsPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: raw, id } = await params;
  const locale = isLocale(raw) ? raw : "ar";
  const dict = getDict(locale);
  const conference = await getConferenceById(Number(id));
  if (!conference) notFound();
  const [sessions, tracks] = await Promise.all([getSessionsWithSpeakers(conference.id), getTracks(conference.id)]);
  const trackById = new Map(tracks.map((t) => [t.id, t]));
  const base = `/${locale}/admin/conferences/${conference.id}`;
  return (
    <>
      <PageHeader
        title={dict.admin.sessions}
        actions={
          <Link href={`${base}/sessions/new`} className="btn-primary">
            + {dict.admin.newSession}
          </Link>
        }
      />
      <section className="card mb-6 p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">{dict.admin.tracks}</h2>
        <div className="flex flex-wrap gap-2">
          {tracks.map((t) => (
            <form key={t.id} action={deleteTrack} className="flex items-center gap-1 rounded-full border border-slate-200 ps-3 text-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
              <span>{localized(t, "name", locale)}</span>
              <input type="hidden" name="id" value={t.id} />
              <ConfirmButton message={dict.admin.confirmDelete} className="btn-ghost btn-sm rounded-full">×</ConfirmButton>
            </form>
          ))}
        </div>
        <form action={saveTrack} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
          <input type="hidden" name="conferenceId" value={conference.id} />
          <input name="nameAr" className="input" placeholder={dict.admin.trackFields.nameAr} dir="rtl" />
          <input name="nameEn" className="input" placeholder={dict.admin.trackFields.nameEn} dir="ltr" />
          <input name="color" type="color" defaultValue="#2a807a" className="h-10 w-14 rounded-xl border border-slate-300" title={dict.common.color} />
          <button type="submit" className="btn-outline">{dict.admin.newTrack}</button>
        </form>
      </section>
      {sessions.length === 0 ? (
        <p className="card p-8 text-center text-slate-500">{dict.common.none}</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>{dict.common.day}</th>
                <th>{dict.admin.sessionFields.startTime}</th>
                <th>{dict.common.name}</th>
                <th>{dict.common.type}</th>
                <th>{dict.common.track}</th>
                <th>{dict.common.room}</th>
                <th>{dict.admin.speakers}</th>
                <th>{dict.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const track = s.trackId ? trackById.get(s.trackId) : undefined;
                return (
                  <tr key={s.id}>
                    <td className="whitespace-nowrap">{formatDate(s.day, locale, { month: "short" })}</td>
                    <td className="whitespace-nowrap" dir="ltr">{s.startTime}–{s.endTime}</td>
                    <td>
                      <Link href={`${base}/sessions/${s.id}`} className="font-medium text-slate-900 hover:text-brand-700">
                        {localized(s, "title", locale)}
                      </Link>
                    </td>
                    <td>{dict.conference.sessionTypes[s.type]}</td>
                    <td>{track ? localized(track, "name", locale) : "—"}</td>
                    <td>{s.room || "—"}</td>
                    <td>{s.speakers.map((sp) => localized(sp, "name", locale)).join("، ") || "—"}</td>
                    <td className="whitespace-nowrap">
                      <Link href={`${base}/sessions/${s.id}`} className="btn-outline btn-sm">{dict.common.edit}</Link>{" "}
                      <form action={deleteSession} className="inline">
                        <input type="hidden" name="id" value={s.id} />
                        <ConfirmButton message={dict.admin.confirmDelete}>{dict.common.delete}</ConfirmButton>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
