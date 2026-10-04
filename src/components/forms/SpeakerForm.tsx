"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveSpeaker } from "@/actions/speakers";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import type { Speaker } from "@/db/schema";
import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries";
import { initialActionState } from "@/lib/form";

export function SpeakerForm({ locale, dict, conferenceId, speaker }: { locale: Locale; dict: Dict; conferenceId: number; speaker?: Speaker | null }) {
  const [state, action] = useActionState(saveSpeaker, initialActionState);
  const f = dict.admin.speakerFields;
  const s = speaker;
  const err = state.errors ?? {};
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="conferenceId" value={conferenceId} />
      {s ? <input type="hidden" name="id" value={s.id} /> : null}
      {state.message ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{state.message}</p> : null}
      <section className="card p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={f.nameAr} name="nameAr" required error={err.nameAr}>
            <input id="nameAr" name="nameAr" className="input" dir="rtl" defaultValue={s?.nameAr ?? ""} required />
          </Field>
          <Field label={f.nameEn} name="nameEn" required error={err.nameEn}>
            <input id="nameEn" name="nameEn" className="input" dir="ltr" defaultValue={s?.nameEn ?? ""} required />
          </Field>
          <Field label={f.jobTitleAr} name="jobTitleAr">
            <input id="jobTitleAr" name="jobTitleAr" className="input" dir="rtl" defaultValue={s?.jobTitleAr ?? ""} />
          </Field>
          <Field label={f.jobTitleEn} name="jobTitleEn">
            <input id="jobTitleEn" name="jobTitleEn" className="input" dir="ltr" defaultValue={s?.jobTitleEn ?? ""} />
          </Field>
          <Field label={dict.common.organization} name="organization">
            <input id="organization" name="organization" className="input" defaultValue={s?.organization ?? ""} />
          </Field>
          <Field label={dict.common.photoUrl} name="photoUrl">
            <input id="photoUrl" name="photoUrl" className="input" dir="ltr" defaultValue={s?.photoUrl ?? ""} placeholder="https://" />
          </Field>
          <Field label={f.bioAr} name="bioAr">
            <textarea id="bioAr" name="bioAr" className="input min-h-32" dir="rtl" defaultValue={s?.bioAr ?? ""} />
          </Field>
          <Field label={f.bioEn} name="bioEn">
            <textarea id="bioEn" name="bioEn" className="input min-h-32" dir="ltr" defaultValue={s?.bioEn ?? ""} />
          </Field>
          <Field label={dict.common.email} name="email">
            <input id="email" name="email" type="email" className="input" dir="ltr" defaultValue={s?.email ?? ""} />
          </Field>
          <Field label={dict.common.website} name="website">
            <input id="website" name="website" className="input" dir="ltr" defaultValue={s?.website ?? ""} placeholder="https://" />
          </Field>
          <Field label={dict.common.linkedin} name="linkedin">
            <input id="linkedin" name="linkedin" className="input" dir="ltr" defaultValue={s?.linkedin ?? ""} placeholder="https://" />
          </Field>
          <Field label={dict.common.twitter} name="twitter">
            <input id="twitter" name="twitter" className="input" dir="ltr" defaultValue={s?.twitter ?? ""} placeholder="https://" />
          </Field>
          <Field label={dict.common.sortOrder} name="sortOrder">
            <input id="sortOrder" name="sortOrder" type="number" className="input" defaultValue={s?.sortOrder ?? 0} />
          </Field>
          <label className="flex items-center gap-2 self-end pb-3 text-sm font-medium text-slate-700">
            <input type="checkbox" name="isKeynote" defaultChecked={s?.isKeynote ?? false} className="h-4 w-4 rounded border-slate-300" />
            {f.isKeynote}
          </label>
        </div>
      </section>
      <div className="flex gap-2">
        <SubmitButton pendingLabel={dict.common.processing}>{dict.common.save}</SubmitButton>
        <Link href={`/${locale}/admin/conferences/${conferenceId}/speakers`} className="btn-outline">
          {dict.common.cancel}
        </Link>
      </div>
    </form>
  );
}
