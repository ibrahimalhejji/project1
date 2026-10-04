"use client";

import { useActionState } from "react";
import { registerAttendee } from "@/actions/registrations";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries";
import { TICKET_TYPES } from "@/lib/constants";
import { initialActionState } from "@/lib/form";

export function RegisterForm({ locale, dict, conferenceId }: { locale: Locale; dict: Dict; conferenceId: number }) {
  const [state, action] = useActionState(registerAttendee, initialActionState);
  const err = state.errors ?? {};
  if (state.ok) {
    return (
      <div className="card border-emerald-200 bg-emerald-50 p-8 text-center">
        <h2 className="text-2xl font-bold text-emerald-800">{dict.register.success}</h2>
        <p className="mt-2 text-emerald-900">{dict.register.successBody}</p>
        <p className="mt-6 text-sm text-slate-600">{dict.common.code}</p>
        <p className="mt-1 font-mono text-3xl font-bold tracking-wider text-brand-800" dir="ltr">{state.code}</p>
      </div>
    );
  }
  return (
    <form action={action} className="card space-y-4 p-6 md:p-8">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="conferenceId" value={conferenceId} />
      {state.message ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{state.message}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={dict.register.fullName} name="fullName" required error={err.fullName} className="md:col-span-2">
          <input id="fullName" name="fullName" className="input" required autoComplete="name" />
        </Field>
        <Field label={dict.common.email} name="email" required error={err.email}>
          <input id="email" name="email" type="email" className="input" dir="ltr" required autoComplete="email" />
        </Field>
        <Field label={dict.common.phone} name="phone" optionalLabel={dict.common.optional}>
          <input id="phone" name="phone" type="tel" className="input" dir="ltr" autoComplete="tel" />
        </Field>
        <Field label={dict.common.organization} name="organization" optionalLabel={dict.common.optional}>
          <input id="organization" name="organization" className="input" autoComplete="organization" />
        </Field>
        <Field label={dict.common.jobTitle} name="jobTitle" optionalLabel={dict.common.optional}>
          <input id="jobTitle" name="jobTitle" className="input" autoComplete="organization-title" />
        </Field>
        <Field label={dict.register.ticketType} name="ticketType">
          <select id="ticketType" name="ticketType" className="input" defaultValue="standard">
            {TICKET_TYPES.map((t) => (
              <option key={t} value={t}>
                {dict.register.tickets[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={dict.register.notes} name="notes" optionalLabel={dict.common.optional} className="md:col-span-2">
          <textarea id="notes" name="notes" className="input min-h-24" />
        </Field>
      </div>
      <SubmitButton pendingLabel={dict.common.processing} className="btn-primary w-full md:w-auto">
        {dict.register.submit}
      </SubmitButton>
    </form>
  );
}
