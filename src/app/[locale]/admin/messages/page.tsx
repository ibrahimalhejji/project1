import { deleteMessage, markMessageRead } from "@/actions/messages";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { PageHeader } from "@/components/admin/PageHeader";
import { listMessages } from "@/db/queries";
import { isLocale } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";
import { formatDateTime } from "@/lib/utils";

export default async function MessagesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "ar";
  const dict = getDict(locale);
  const rows = await listMessages();
  return (
    <>
      <PageHeader title={dict.admin.messages} />
      {rows.length === 0 ? (
        <p className="card p-8 text-center text-slate-500">{dict.common.none}</p>
      ) : (
        <div className="space-y-3">
          {rows.map((m) => (
            <article key={m.id} className={`card p-5 ${m.isRead ? "" : "border-brand-300 bg-brand-50/40"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{m.subject || "—"}</p>
                  <p className="text-xs text-slate-500">
                    {m.name} · <a href={`mailto:${m.email}`} className="text-brand-700 hover:underline" dir="ltr">{m.email}</a> · {formatDateTime(m.createdAt, locale)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!m.isRead ? (
                    <form action={markMessageRead}>
                      <input type="hidden" name="id" value={m.id} />
                      <button type="submit" className="btn-outline btn-sm">{dict.admin.markRead}</button>
                    </form>
                  ) : null}
                  <form action={deleteMessage}>
                    <input type="hidden" name="id" value={m.id} />
                    <ConfirmButton message={dict.admin.confirmDelete}>{dict.common.delete}</ConfirmButton>
                  </form>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">{m.body}</p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
