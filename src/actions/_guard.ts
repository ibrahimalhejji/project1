import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";
import { str } from "@/lib/form";

export async function requireAdminAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !["admin", "organizer"].includes(user.role)) throw new Error("Unauthorized");
}

export function localeFrom(form: FormData): Locale {
  const value = str(form, "locale");
  return isLocale(value) ? value : defaultLocale;
}

export function revalidateAll() {
  revalidatePath("/", "layout");
}
