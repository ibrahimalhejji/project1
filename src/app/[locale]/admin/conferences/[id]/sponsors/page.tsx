import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteSponsor } from "@/actions/sponsors";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { PageHeader } from "@/components/admin/PageHeader";
import { getConferenceById, getSponsors } from "@/db/queries";
import { isLocale } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";

export default async function SponsorsAdminPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: raw, id } = await params;
  const locale = isLocale(raw) ? raw : "ar";
  const dict = getDict(locale);
  const conference = await getConferenceById(Number(id));
  if (!conference) notFound();
  const sponsors = await getSponsors(conference.id);
  const base = `/${locale}/admin/conferences/${conference.id}`;
  return (
    <>
      <PageHeader
        title={dict.admin.sponsors}
        actions={
          <Link href={`${base}/sponsors/new`} className="btn-primary">
            + {dict.admin.newSponsor}
          </Link>
        }
      />
      {sponsors.length === 0 ? (
        <p className="card p-8 text-center text-slate-500">{dict.common.none}</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>{dict.common.name}</th>
                <th>{dict.admin.sponsorFields.tier}</th>
                <th>{dict.common.website}</th>
                <th>{dict.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {sponsors.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium text-slate-900">{s.name}</td>
                  <td>{dict.conference.tiers[s.tier]}</td>
                  <td dir="ltr">{s.website ? <a href={s.website} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">{s.website}</a> : "—"}</td>
                  <td className="whitespace-nowrap">
                    <Link href={`${base}/sponsors/${s.id}`} className="btn-outline btn-sm">{dict.common.edit}</Link>{" "}
                    <form action={deleteSponsor} className="inline">
                      <input type="hidden" name="id" value={s.id} />
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
