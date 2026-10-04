import { PageHeader } from "@/components/admin/PageHeader";
import { ConferenceForm } from "@/components/forms/ConferenceForm";
import { isLocale } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";
import { listOrganizers } from "@/db/queries";
import { requireAdmin } from "@/lib/auth";

export default async function NewConferencePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "ar";
  const dict = getDict(locale);
  const user = await requireAdmin(locale);
  const owners = user.role === "admin" ? await listOrganizers() : undefined;
  return (
    <>
      <PageHeader title={dict.admin.newConference} />
      <ConferenceForm locale={locale} dict={dict} owners={owners} />
    </>
  );
}
