"use client";

import { useActionState } from "react";
import { sendMessage } from "@/actions/messages";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries";
import { initialActionState } from "@/lib/form";

export function ContactForm({ locale, dict, category = "contact", submitLabel }: { locale: Locale; dict: Dict; category?: "contact" | "support"; submitLabel?: string }) {
  const [state, action] = useActionState(sendMessage, initialActionState);
  const err = state.errors ?? {};
  if (state.ok) {
    return (
      <div className="card border-emerald-200 bg-emerald-50 p-8 text-center">
        <p className="text-lg font-semibold text-emerald-800">{state.message}</p>
      </div>
    );
  }
  return (
    <form action={action} className="card space-y-4 p-6 md:p-8">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="category" value={category} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={dict.common.name} name="name" required error={err.name}>
          <input id="name" name="name" className="input" required />
        </Field>
        <Field label={dict.common.email} name="email" required error={err.email}>
          <input id="email" name="email" type="email" className="input" dir="ltr" required />
        </Field>
        <Field label={dict.contact.subject} name="subject" optionalLabel={dict.common.optional} className="md:col-span-2">
          <input id="subject" name="subject" className="input" />
        </Field>
        <Field label={dict.contact.message} name="body" required error={err.body} className="md:col-span-2">
          <textarea id="body" name="body" className="input min-h-36" required />
        </Field>
      </div>
      <SubmitButton pendingLabel={dict.common.processing}>{submitLabel ?? dict.contact.send}</SubmitButton>
    </form>
  );
}
