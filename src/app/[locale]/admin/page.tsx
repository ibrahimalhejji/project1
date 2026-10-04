import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { dashboardStats } from "@/db/queries";
import { isLocale } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime, localized } from "@/lib/utils";

export default async function AdminDashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "ar";
  const dict = getDict(locale);
  const user = await requireAdmin(locale);
  const stats = await dashboardStats(user);
  const cards = [
    { label: dict.admin.totalConferences, value: stats.totalConferences, href: `/${locale}/admin/conferences` },
    { label: dict.admin.publishedConferences, value: stats.publishedConferences, href: `/${locale}/admin/conferences` },
    { label: dict.admin.totalRegistrations, value: stats.totalRegistrations, href: `/${locale}/admin/conferences` },
    { label: dict.admin.pendingAbstracts, value: stats.pendingAbstracts, href: `/${locale}/admin/conferences` },
    ...(user.role === "admin" ? [{ label: dict.admin.unreadMessages, value: stats.unreadMessages, href: `/${locale}/admin/messages` }] : []),
  ];
  return (
    <>
      <PageHeader
        title={dict.admin.title}
        subtitle={`${dict.admin.welcome}، ${user.name}`}
        actions={
          <Link href={`/${locale}/admin/conferences/new`} className="btn-primary">
            + {dict.admin.newConference}
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="card p-5 transition hover:shadow-md">
            <p className="text-3xl font-black text-brand-700">{card.value}</p>
            <p className="mt-1 text-sm text-slate-600">{card.label}</p>
          </Link>
        ))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 text-base font-bold text-slate-900">{dict.admin.recentRegistrations}</h2>
          {stats.recentRegistrations.length === 0 ? (
            <p className="text-sm text-slate-500">{dict.common.none}</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {stats.recentRegistrations.map(({ registration, conference }) => (
                <li key={registration.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{registration.fullName}</p>
                    <p className="truncate text-xs text-slate-500">
                      {localized(conference, "title", locale)} · {formatDateTime(registration.createdAt, locale)}
                    </p>
                  </div>
                  <StatusBadge status={registration.status} dict={dict} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card p-5">
          <h2 className="mb-3 text-base font-bold text-slate-900">{dict.admin.recentAbstracts}</h2>
          {stats.recentAbstracts.length === 0 ? (
            <p className="text-sm text-slate-500">{dict.common.none}</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {stats.recentAbstracts.map(({ abstract, conference }) => (
                <li key={abstract.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link href={`/${locale}/admin/conferences/${conference.id}/abstracts`} className="block truncate font-medium text-slate-900 hover:text-brand-700">
                      {abstract.title}
                    </Link>
                    <p className="truncate text-xs text-slate-500">
                      {abstract.authors} · {localized(conference, "title", locale)}
                    </p>
                  </div>
                  <StatusBadge status={abstract.status} dict={dict} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
