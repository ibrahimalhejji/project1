"use client";

import { useActionState } from "react";
import { submitAbstract } from "@/actions/abstracts";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries";
import { initialActionState } from "@/lib/form";

export function AbstractForm({ locale, dict, conferenceId }: { locale: Locale; dict: Dict; conferenceId: number }) {
  const [state, action] = useActionState(submitAbstract, initialActionState);
  const err = state.errors ?? {};
  if (state.ok) {
    return (
      <div className="card border-emerald-200 bg-emerald-50 p-8 text-center">
        <h2 className="text-2xl font-bold text-emerald-800">{dict.abstract.success}</h2>
        <p className="mt-2 text-emerald-900">{dict.abstract.successBody}</p>
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
        <Field label={dict.abstract.abstractTitle} name="title" required error={err.title} className="md:col-span-2">
          <input id="title" name="title" className="input" required />
        </Field>
        <Field label={dict.abstract.authors} name="authors" required error={err.authors}>
          <input id="authors" name="authors" className="input" required />
        </Field>
        <Field label={dict.common.email} name="email" required error={err.email}>
          <input id="email" name="email" type="email" className="input" dir="ltr" required />
        </Field>
        <Field label={dict.abstract.affiliation} name="affiliation" optionalLabel={dict.common.optional}>
          <input id="affiliation" name="affiliation" className="input" />
        </Field>
        <Field label={dict.abstract.topic} name="topic" optionalLabel={dict.common.optional}>
          <input id="topic" name="topic" className="input" />
        </Field>
        <Field label={dict.abstract.keywords} name="keywords" optionalLabel={dict.common.optional} className="md:col-span-2">
          <input id="keywords" name="keywords" className="input" />
        </Field>
        <Field label={dict.abstract.body} name="body" required error={err.body} help={dict.abstract.bodyHelp} className="md:col-span-2">
          <textarea id="body" name="body" className="input min-h-48" minLength={100} maxLength={3000} required />
        </Field>
      </div>
      <SubmitButton pendingLabel={dict.common.processing} className="btn-primary w-full md:w-auto">
        {dict.abstract.submit}
      </SubmitButton>
    </form>
  );
}
