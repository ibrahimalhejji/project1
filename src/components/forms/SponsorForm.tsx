"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveSponsor } from "@/actions/sponsors";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import type { Sponsor } from "@/db/schema";
import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries";
import { SPONSOR_TIERS } from "@/lib/constants";
import { initialActionState } from "@/lib/form";

export function SponsorForm({ locale, dict, conferenceId, sponsor }: { locale: Locale; dict: Dict; conferenceId: number; sponsor?: Sponsor | null }) {
  const [state, action] = useActionState(saveSponsor, initialActionState);
  const s = sponsor;
  const err = state.errors ?? {};
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="conferenceId" value={conferenceId} />
      {s ? <input type="hidden" name="id" value={s.id} /> : null}
      {state.message ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{state.message}</p> : null}
      <section className="card p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={dict.common.name} name="name" required error={err.name}>
            <input id="name" name="name" className="input" defaultValue={s?.name ?? ""} required />
          </Field>
          <Field label={dict.admin.sponsorFields.tier} name="tier">
            <select id="tier" name="tier" className="input" defaultValue={s?.tier ?? "partner"}>
              {SPONSOR_TIERS.map((t) => (
                <option key={t} value={t}>
                  {dict.conference.tiers[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label={dict.common.logoUrl} name="logoUrl">
            <input id="logoUrl" name="logoUrl" className="input" dir="ltr" defaultValue={s?.logoUrl ?? ""} placeholder="https://" />
          </Field>
          <Field label={dict.common.website} name="website">
            <input id="website" name="website" className="input" dir="ltr" defaultValue={s?.website ?? ""} placeholder="https://" />
          </Field>
          <Field label={dict.common.sortOrder} name="sortOrder">
            <input id="sortOrder" name="sortOrder" type="number" className="input" defaultValue={s?.sortOrder ?? 0} />
          </Field>
        </div>
      </section>
      <div className="flex gap-2">
        <SubmitButton pendingLabel={dict.common.processing}>{dict.common.save}</SubmitButton>
        <Link href={`/${locale}/admin/conferences/${conferenceId}/sponsors`} className="btn-outline">
          {dict.common.cancel}
        </Link>
      </div>
    </form>
  );
}
