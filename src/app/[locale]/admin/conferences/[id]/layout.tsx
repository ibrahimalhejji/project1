import Link from "next/link";
import { notFound } from "next/navigation";
import { ConferenceTabs } from "@/components/admin/ConferenceTabs";
import { StatusBadge } from "@/components/StatusBadge";
import { conferenceCounts, getConferenceById } from "@/db/queries";
import { isLocale } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";
import { formatDateRange, localized } from "@/lib/utils";

export default async function ConferenceAdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string; id: string }> }) {
  const { locale: raw, id } = await params;
  const locale = isLocale(raw) ? raw : "ar";
  const dict = getDict(locale);
  const conference = await getConferenceById(Number(id));
  if (!conference) notFound();
  const counts = await conferenceCounts(conference.id);
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/${locale}/admin/conferences`} className="text-xs text-slate-500 hover:text-brand-700">
            ← {dict.admin.conferences}
          </Link>
          <h1 className="mt-1 flex flex-wrap items-center gap-3 text-2xl font-bold text-slate-900">
            {localized(conference, "title", locale)}
            <StatusBadge status={conference.status} dict={dict} />
          </h1>
          <p className="text-sm text-slate-500">{formatDateRange(conference.startDate, conference.endDate, locale)}</p>
        </div>
        <Link href={`/${locale}/conferences/${conference.slug}`} className="btn-outline btn-sm" target="_blank">
          {dict.admin.viewSite}
        </Link>
      </div>
      <ConferenceTabs locale={locale} dict={dict} conferenceId={conference.id} counts={counts} />
      {children}
    </>
  );
}
