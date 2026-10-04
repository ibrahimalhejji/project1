import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { listAllConferences } from "@/db/queries";
import { isLocale } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";
import { formatDateRange, localized } from "@/lib/utils";

export default async function AdminConferencesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "ar";
  const dict = getDict(locale);
  const conferences = await listAllConferences();
  return (
    <>
      <PageHeader
        title={dict.admin.conferences}
        actions={
          <Link href={`/${locale}/admin/conferences/new`} className="btn-primary">
            + {dict.admin.newConference}
          </Link>
        }
      />
      {conferences.length === 0 ? (
        <p className="card p-8 text-center text-slate-500">{dict.admin.noConferences}</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>{dict.common.name}</th>
                <th>{dict.common.date}</th>
                <th>{dict.common.status}</th>
                <th>{dict.conference.registration}</th>
                <th>{dict.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {conferences.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/${locale}/admin/conferences/${c.id}`} className="font-medium text-slate-900 hover:text-brand-700">
                      {localized(c, "title", locale)}
                    </Link>
                    <p className="text-xs text-slate-500" dir="ltr">
                      /{c.slug}
                    </p>
                  </td>
                  <td className="whitespace-nowrap">{formatDateRange(c.startDate, c.endDate, locale)}</td>
                  <td>
                    <StatusBadge status={c.status} dict={dict} />
                  </td>
                  <td>{c.registrationOpen ? <span className="badge bg-emerald-100 text-emerald-800">{dict.conference.registrationOpen}</span> : <span className="badge bg-slate-100 text-slate-600">{dict.conference.registrationClosed}</span>}</td>
                  <td className="whitespace-nowrap">
                    <Link href={`/${locale}/admin/conferences/${c.id}`} className="btn-outline btn-sm">
                      {dict.admin.manage}
                    </Link>{" "}
                    <Link href={`/${locale}/conferences/${c.slug}`} className="btn-ghost btn-sm" target="_blank">
                      {dict.admin.viewSite}
                    </Link>
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
