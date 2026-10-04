import { notFound } from "next/navigation";
import { deleteUser, updateUserRole } from "@/actions/users";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { PageHeader } from "@/components/admin/PageHeader";
import { listUsers } from "@/db/queries";
import { isLocale } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";
import { requireAdmin } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

export default async function UsersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "ar";
  const dict = getDict(locale);
  const me = await requireAdmin(locale);
  if (me.role !== "admin") notFound();
  const rows = await listUsers();
  return (
    <>
      <PageHeader title={dict.admin.users} subtitle={`${rows.length}`} />
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>{dict.common.name}</th>
              <th>{dict.common.organization}</th>
              <th>{dict.admin.role}</th>
              <th>{dict.admin.conferencesCount}</th>
              <th>{dict.admin.joined}</th>
              <th>{dict.common.actions}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td>
                  <p className="font-medium text-slate-900">{u.name}{u.id === me.id ? " ★" : ""}</p>
                  <p className="text-xs text-slate-500" dir="ltr">{u.email}</p>
                </td>
                <td>{u.organization || "—"}</td>
                <td>
                  {u.id === me.id ? (
                    dict.admin.roles[u.role]
                  ) : (
                    <form action={updateUserRole} className="inline-flex items-center gap-1">
                      <input type="hidden" name="id" value={u.id} />
                      <select name="role" defaultValue={u.role} className="input w-auto py-1 text-xs">
                        {USER_ROLES.map((r) => (
                          <option key={r} value={r}>{dict.admin.roles[r]}</option>
                        ))}
                      </select>
                      <button type="submit" className="btn-outline btn-sm">{dict.common.save}</button>
                    </form>
                  )}
                </td>
                <td>{Number(u.conferences)}</td>
                <td className="whitespace-nowrap">{formatDateTime(u.createdAt, locale)}</td>
                <td>
                  {u.id !== me.id ? (
                    <form action={deleteUser} className="inline">
                      <input type="hidden" name="id" value={u.id} />
                      <ConfirmButton message={dict.admin.confirmDelete}>{dict.common.delete}</ConfirmButton>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
