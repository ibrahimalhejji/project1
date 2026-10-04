"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveConference } from "@/actions/conferences";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import type { Conference } from "@/db/schema";
import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries";
import { CONFERENCE_STATUSES } from "@/lib/constants";
import { initialActionState } from "@/lib/form";

type Owner = { id: number; name: string; email: string };

export function ConferenceForm({ locale, dict, conference, owners }: { locale: Locale; dict: Dict; conference?: Conference | null; owners?: Owner[] }) {
  const [state, action] = useActionState(saveConference, initialActionState);
  const f = dict.admin.conferenceFields;
  const c = conference;
  const err = state.errors ?? {};
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />
      {c ? <input type="hidden" name="id" value={c.id} /> : null}
      {state.message ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{state.message}</p> : null}

      <section className="card p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900">{f.basics}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={f.titleAr} name="titleAr" required error={err.titleAr}>
            <input id="titleAr" name="titleAr" className="input" dir="rtl" defaultValue={c?.titleAr ?? ""} required />
          </Field>
          <Field label={f.titleEn} name="titleEn" required error={err.titleEn}>
            <input id="titleEn" name="titleEn" className="input" dir="ltr" defaultValue={c?.titleEn ?? ""} required />
          </Field>
          <Field label={f.taglineAr} name="taglineAr">
            <input id="taglineAr" name="taglineAr" className="input" dir="rtl" defaultValue={c?.taglineAr ?? ""} />
          </Field>
          <Field label={f.taglineEn} name="taglineEn">
            <input id="taglineEn" name="taglineEn" className="input" dir="ltr" defaultValue={c?.taglineEn ?? ""} />
          </Field>
          <Field label={f.slug} name="slug" help={f.slugHelp}>
            <input id="slug" name="slug" className="input" dir="ltr" defaultValue={c?.slug ?? ""} pattern="[a-z0-9-]*" />
          </Field>
          <Field label={f.status} name="status">
            <select id="status" name="status" className="input" defaultValue={c?.status ?? "draft"}>
              {CONFERENCE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {dict.admin.statuses[s]}
                </option>
              ))}
            </select>
          </Field>
          {owners ? (
            <Field label={dict.admin.owner} name="ownerId" help={dict.admin.ownerHelp} className="md:col-span-2">
              <select id="ownerId" name="ownerId" className="input" defaultValue={c?.ownerId ?? ""}>
                <option value="">{dict.admin.noOwner}</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.email})
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900">{f.content}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={f.descriptionAr} name="descriptionAr">
            <textarea id="descriptionAr" name="descriptionAr" className="input min-h-40" dir="rtl" defaultValue={c?.descriptionAr ?? ""} />
          </Field>
          <Field label={f.descriptionEn} name="descriptionEn">
            <textarea id="descriptionEn" name="descriptionEn" className="input min-h-40" dir="ltr" defaultValue={c?.descriptionEn ?? ""} />
          </Field>
          <Field label={f.heroImage} name="heroImage" className="md:col-span-2">
            <input id="heroImage" name="heroImage" className="input" dir="ltr" type="url" defaultValue={c?.heroImage ?? ""} placeholder="https://" />
          </Field>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900">{f.logistics}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={f.startDate} name="startDate" required error={err.startDate}>
            <input id="startDate" name="startDate" type="date" className="input" defaultValue={c?.startDate ?? ""} required />
          </Field>
          <Field label={f.endDate} name="endDate">
            <input id="endDate" name="endDate" type="date" className="input" defaultValue={c?.endDate ?? ""} />
          </Field>
          <Field label={f.venueAr} name="venueAr">
            <input id="venueAr" name="venueAr" className="input" dir="rtl" defaultValue={c?.venueAr ?? ""} />
          </Field>
          <Field label={f.venueEn} name="venueEn">
            <input id="venueEn" name="venueEn" className="input" dir="ltr" defaultValue={c?.venueEn ?? ""} />
          </Field>
          <Field label={f.city} name="city">
            <input id="city" name="city" className="input" defaultValue={c?.city ?? ""} />
          </Field>
          <Field label={f.country} name="country">
            <input id="country" name="country" className="input" defaultValue={c?.country ?? ""} />
          </Field>
          <Field label={dict.common.website} name="website">
            <input id="website" name="website" className="input" dir="ltr" defaultValue={c?.website ?? ""} placeholder="https://" />
          </Field>
          <Field label={f.contactEmail} name="contactEmail">
            <input id="contactEmail" name="contactEmail" type="email" className="input" dir="ltr" defaultValue={c?.contactEmail ?? ""} />
          </Field>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900">{f.settings}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" name="registrationOpen" defaultChecked={c?.registrationOpen ?? false} className="h-4 w-4 rounded border-slate-300" />
            {f.registrationOpen}
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" name="abstractsOpen" defaultChecked={c?.abstractsOpen ?? false} className="h-4 w-4 rounded border-slate-300" />
            {f.abstractsOpen}
          </label>
          <Field label={f.capacity} name="capacity">
            <input id="capacity" name="capacity" type="number" min={0} className="input" defaultValue={c?.capacity ?? 0} />
          </Field>
          <Field label={f.abstractDeadline} name="abstractDeadline">
            <input id="abstractDeadline" name="abstractDeadline" type="date" className="input" defaultValue={c?.abstractDeadline ?? ""} />
          </Field>
          <Field label={f.price} name="price">
            <input id="price" name="price" type="number" min={0} step="0.01" className="input" defaultValue={c?.price ?? 0} />
          </Field>
          <Field label={f.currency} name="currency">
            <input id="currency" name="currency" className="input" dir="ltr" maxLength={3} defaultValue={c?.currency ?? "SAR"} />
          </Field>
        </div>
      </section>

      <div className="flex gap-2">
        <SubmitButton pendingLabel={dict.common.processing}>{dict.common.save}</SubmitButton>
        <Link href={`/${locale}/admin/conferences`} className="btn-outline">
          {dict.common.cancel}
        </Link>
      </div>
    </form>
  );
}
