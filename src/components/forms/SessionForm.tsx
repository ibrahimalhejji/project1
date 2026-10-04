"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveSession } from "@/actions/sessions";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import type { Session, Speaker, Track } from "@/db/schema";
import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries";
import { SESSION_TYPES } from "@/lib/constants";
import { initialActionState } from "@/lib/form";
import { localized } from "@/lib/utils";

type Props = {
  locale: Locale;
  dict: Dict;
  conferenceId: number;
  session?: (Session & { speakerIds: number[] }) | null;
  tracks: Track[];
  speakers: Speaker[];
  defaultDay: string;
  minDay: string;
  maxDay: string;
};

export function SessionForm({ locale, dict, conferenceId, session, tracks, speakers, defaultDay, minDay, maxDay }: Props) {
  const [state, action] = useActionState(saveSession, initialActionState);
  const f = dict.admin.sessionFields;
  const s = session;
  const err = state.errors ?? {};
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="conferenceId" value={conferenceId} />
      {s ? <input type="hidden" name="id" value={s.id} /> : null}
      {state.message ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{state.message}</p> : null}
      <section className="card p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={f.titleAr} name="titleAr" required error={err.titleAr}>
            <input id="titleAr" name="titleAr" className="input" dir="rtl" defaultValue={s?.titleAr ?? ""} required />
          </Field>
          <Field label={f.titleEn} name="titleEn" required error={err.titleEn}>
            <input id="titleEn" name="titleEn" className="input" dir="ltr" defaultValue={s?.titleEn ?? ""} required />
          </Field>
          <Field label={f.abstractAr} name="abstractAr">
            <textarea id="abstractAr" name="abstractAr" className="input min-h-28" dir="rtl" defaultValue={s?.abstractAr ?? ""} />
          </Field>
          <Field label={f.abstractEn} name="abstractEn">
            <textarea id="abstractEn" name="abstractEn" className="input min-h-28" dir="ltr" defaultValue={s?.abstractEn ?? ""} />
          </Field>
          <Field label={f.day} name="day" required error={err.day}>
            <input id="day" name="day" type="date" className="input" defaultValue={s?.day ?? defaultDay} min={minDay} max={maxDay} required />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={f.startTime} name="startTime" required error={err.startTime}>
              <input id="startTime" name="startTime" type="time" className="input" defaultValue={s?.startTime ?? "09:00"} required />
            </Field>
            <Field label={f.endTime} name="endTime" required error={err.endTime}>
              <input id="endTime" name="endTime" type="time" className="input" defaultValue={s?.endTime ?? "10:00"} required />
            </Field>
          </div>
          <Field label={dict.common.type} name="type">
            <select id="type" name="type" className="input" defaultValue={s?.type ?? "talk"}>
              {SESSION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {dict.conference.sessionTypes[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label={dict.common.track} name="trackId">
            <select id="trackId" name="trackId" className="input" defaultValue={s?.trackId ?? ""}>
              <option value="">{f.noTrack}</option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {localized(t, "name", locale)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={dict.common.room} name="room">
            <input id="room" name="room" className="input" defaultValue={s?.room ?? ""} />
          </Field>
          <Field label={dict.common.sortOrder} name="sortOrder">
            <input id="sortOrder" name="sortOrder" type="number" className="input" defaultValue={s?.sortOrder ?? 0} />
          </Field>
        </div>
        <fieldset className="mt-5">
          <legend className="label">{f.speakers}</legend>
          {speakers.length === 0 ? (
            <p className="text-sm text-slate-500">{dict.common.none}</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {speakers.map((sp) => (
                <label key={sp.id} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <input type="checkbox" name="speakerIds" value={sp.id} defaultChecked={s?.speakerIds.includes(sp.id) ?? false} className="h-4 w-4 rounded border-slate-300" />
                  <span>{localized(sp, "name", locale)}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>
      </section>
      <div className="flex gap-2">
        <SubmitButton pendingLabel={dict.common.processing}>{dict.common.save}</SubmitButton>
        <Link href={`/${locale}/admin/conferences/${conferenceId}/sessions`} className="btn-outline">
          {dict.common.cancel}
        </Link>
      </div>
    </form>
  );
}
