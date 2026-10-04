import { notFound } from "next/navigation";
import { deleteAbstract, reviewAbstract } from "@/actions/abstracts";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { getAbstracts, getConferenceById } from "@/db/queries";
import { isLocale } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";
import { ABSTRACT_STATUSES } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

export default async function AbstractsPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: raw, id } = await params;
  const locale = isLocale(raw) ? raw : "ar";
  const dict = getDict(locale);
  const conference = await getConferenceById(Number(id));
  if (!conference) notFound();
  const rows = await getAbstracts(conference.id);
  return (
    <>
      <PageHeader title={dict.admin.abstracts} subtitle={`${rows.length} ${dict.admin.counts.abstracts}`} />
      {rows.length === 0 ? (
        <p className="card p-8 text-center text-slate-500">{dict.common.none}</p>
      ) : (
        <div className="space-y-4">
          {rows.map((a) => (
            <details key={a.id} className="card group p-5">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{a.title}</p>
                  <p className="text-xs text-slate-500">
                    {a.authors}{a.affiliation ? ` · ${a.affiliation}` : ""} · <span dir="ltr">{a.email}</span> · {formatDateTime(a.createdAt, locale)} · <span className="font-mono" dir="ltr">{a.code}</span>
                  </p>
                </div>
                <StatusBadge status={a.status} dict={dict} />
              </summary>
              <div className="mt-4 border-t border-slate-100 pt-4">
                {a.topic || a.keywords ? (
                  <p className="mb-2 text-xs text-slate-500">
                    {a.topic ? `${dict.abstract.topic}: ${a.topic}` : ""}{a.topic && a.keywords ? " · " : ""}{a.keywords ? `${dict.abstract.keywords}: ${a.keywords}` : ""}
                  </p>
                ) : null}
                <p className="whitespace-pre-line text-sm leading-7 text-slate-700">{a.body}</p>
                <form action={reviewAbstract} className="mt-4 grid gap-3 md:grid-cols-[auto_1fr_auto]">
                  <input type="hidden" name="id" value={a.id} />
                  <select name="status" defaultValue={a.status} className="input w-auto">
                    {ABSTRACT_STATUSES.map((s) => (
                      <option key={s} value={s}>{dict.admin.statuses[s]}</option>
                    ))}
                  </select>
                  <input name="reviewerNotes" className="input" placeholder={dict.admin.reviewerNotes} defaultValue={a.reviewerNotes} />
                  <button type="submit" className="btn-primary">{dict.common.save}</button>
                </form>
                <form action={deleteAbstract} className="mt-3">
                  <input type="hidden" name="id" value={a.id} />
                  <ConfirmButton message={dict.admin.confirmDelete} className="btn-ghost btn-sm text-red-600">{dict.common.delete}</ConfirmButton>
                </form>
              </div>
            </details>
          ))}
        </div>
      )}
    </>
  );
}
