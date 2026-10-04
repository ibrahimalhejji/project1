"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "@/actions/auth";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries";
import { initialActionState } from "@/lib/form";

export function SignupForm({ locale, dict }: { locale: Locale; dict: Dict }) {
  const [state, action] = useActionState(signup, initialActionState);
  const err = state.errors ?? {};
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {state.message ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{state.message}</p> : null}
      <Field label={dict.signup.name} name="name" required error={err.name}>
        <input id="name" name="name" className="input" required autoComplete="name" />
      </Field>
      <Field label={dict.signup.organization} name="organization" optionalLabel={dict.common.optional}>
        <input id="organization" name="organization" className="input" autoComplete="organization" />
      </Field>
      <Field label={dict.common.email} name="email" required error={err.email}>
        <input id="email" name="email" type="email" className="input" dir="ltr" required autoComplete="email" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={dict.signup.password} name="password" required error={err.password} help={dict.signup.passwordHelp}>
          <input id="password" name="password" type="password" className="input" dir="ltr" required minLength={8} autoComplete="new-password" />
        </Field>
        <Field label={dict.signup.confirm} name="confirm" required error={err.confirm}>
          <input id="confirm" name="confirm" type="password" className="input" dir="ltr" required minLength={8} autoComplete="new-password" />
        </Field>
      </div>
      <SubmitButton pendingLabel={dict.common.processing} className="btn-accent w-full">
        {dict.signup.submit}
      </SubmitButton>
      <p className="text-center text-sm text-slate-600">
        {dict.signup.haveAccount}{" "}
        <Link href={`/${locale}/login`} className="font-semibold text-brand-700 hover:underline">
          {dict.login.title}
        </Link>
      </p>
    </form>
  );
}
