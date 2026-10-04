"use client";

import { useActionState } from "react";
import { login } from "@/actions/auth";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries";
import { initialActionState } from "@/lib/form";

export function LoginForm({ locale, dict, next }: { locale: Locale; dict: Dict; next: string }) {
  const [state, action] = useActionState(login, initialActionState);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="next" value={next} />
      {state.message ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{state.message}</p> : null}
      <Field label={dict.login.email} name="email" required>
        <input id="email" name="email" type="email" className="input" dir="ltr" required autoComplete="email" />
      </Field>
      <Field label={dict.login.password} name="password" required>
        <input id="password" name="password" type="password" className="input" dir="ltr" required autoComplete="current-password" />
      </Field>
      <SubmitButton pendingLabel={dict.common.processing} className="btn-primary w-full">
        {dict.login.submit}
      </SubmitButton>
    </form>
  );
}
