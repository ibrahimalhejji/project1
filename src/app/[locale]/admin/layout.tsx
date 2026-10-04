import { Sidebar } from "@/components/admin/Sidebar";
import { dashboardStats } from "@/db/queries";
import { isLocale } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "ar";
  const dict = getDict(locale);
  const user = await requireAdmin(locale);
  const stats = await dashboardStats(user);
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:flex-row">
      <Sidebar locale={locale} dict={dict} unread={stats.unreadMessages} role={user.role} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
