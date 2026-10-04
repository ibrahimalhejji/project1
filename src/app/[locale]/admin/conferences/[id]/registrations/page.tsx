import { notFound } from "next/navigation";
import { deleteRegistration, updateRegistrationStatus } from "@/actions/registrations";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { getConferenceById, getRegistrations } from "@/db/queries";
import { isLocale } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";
import { REGISTRATION_STATUSES } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

export default async function RegistrationsPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: raw, id } = await params;
  const locale = isLocale(raw) ? raw : "ar";
  const dict = getDict(locale);
  const conference = await getConferenceById(Number(id));
  if (!conference) notFound();
  const rows = await getRegistrations(conference.id);
  const active = rows.filter((r) => r.status !== "cancelled").length;
  return (
    <>
      <PageHeader
        title={dict.admin.registrations}
        subtitle={`${active}${conference.capacity ? ` / ${conference.capacity}` : ""} ${dict.admin.counts.registrations}`}
        actions={
          <a href={`/${locale}/admin/conferences/${conference.id}/registrations/export`} className="btn-outline">
            {dict.admin.exportCsv}
          </a>
        }
      />
      {rows.length === 0 ? (
        <p className="card p-8 text-center text-slate-500">{dict.common.none}</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>{dict.common.code}</th>
                <th>{dict.common.name}</th>
                <th>{dict.common.organization}</th>
                <th>{dict.admin.ticket}</th>
                <th>{dict.admin.registeredAt}</th>
                <th>{dict.common.status}</th>
                <th>{dict.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono text-xs" dir="ltr">{r.code}</td>
                  <td>
                    <p className="font-medium text-slate-900">{r.fullName}</p>
                    <p className="text-xs text-slate-500" dir="ltr">{r.email}{r.phone ? ` · ${r.phone}` : ""}</p>
                  </td>
                  <td>{[r.organization, r.jobTitle].filter(Boolean).join(" · ") || "—"}</td>
                  <td>{dict.register.tickets[r.ticketType]}</td>
                  <td className="whitespace-nowrap">{formatDateTime(r.createdAt, locale)}</td>
                  <td><StatusBadge status={r.status} dict={dict} /></td>
                  <td className="whitespace-nowrap">
                    <form action={updateRegistrationStatus} className="inline-flex items-center gap-1">
                      <input type="hidden" name="id" value={r.id} />
                      <select name="status" defaultValue={r.status} className="input w-auto py-1 text-xs">
                        {REGISTRATION_STATUSES.map((s) => (
                          <option key={s} value={s}>{dict.admin.statuses[s]}</option>
                        ))}
                      </select>
                      <button type="submit" className="btn-outline btn-sm">{dict.common.save}</button>
                    </form>{" "}
                    <form action={deleteRegistration} className="inline">
                      <input type="hidden" name="id" value={r.id} />
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
