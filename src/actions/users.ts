"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { int, oneOf } from "@/lib/form";
import { USER_ROLES } from "@/lib/constants";
import { requireAdminAction, revalidateAll } from "./_guard";

export async function updateUserRole(form: FormData) {
  const admin = await requireAdminAction();
  const id = int(form, "id");
  const role = oneOf(form, "role", USER_ROLES, "organizer");
  if (!id || id === admin.id) return; // never change your own role
  await db.update(users).set({ role }).where(eq(users.id, id));
  revalidateAll();
}

export async function deleteUser(form: FormData) {
  const admin = await requireAdminAction();
  const id = int(form, "id");
  if (!id || id === admin.id) return;
  await db.delete(users).where(eq(users.id, id));
  revalidateAll();
}
