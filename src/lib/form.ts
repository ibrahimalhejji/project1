/** Small helpers to read FormData safely inside server actions. */
export function str(form: FormData, key: string, max = 5000): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function num(form: FormData, key: string, fallback = 0): number {
  const value = Number(str(form, key, 50));
  return Number.isFinite(value) ? value : fallback;
}

export function int(form: FormData, key: string, fallback = 0): number {
  return Math.trunc(num(form, key, fallback));
}

export function bool(form: FormData, key: string): boolean {
  const value = form.get(key);
  return value === "on" || value === "true" || value === "1";
}

export function oneOf<T extends readonly string[]>(form: FormData, key: string, allowed: T, fallback: T[number]): T[number] {
  const value = str(form, key, 50);
  return (allowed as readonly string[]).includes(value) ? (value as T[number]) : fallback;
}

export function list(form: FormData, key: string): number[] {
  return form
    .getAll(key)
    .map((v) => Number(v))
    .filter((v) => Number.isInteger(v) && v > 0);
}

export type ActionState = { ok: boolean; message?: string; code?: string; errors?: Record<string, string> };
export const initialActionState: ActionState = { ok: false };
