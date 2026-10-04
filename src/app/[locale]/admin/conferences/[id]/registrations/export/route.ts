import { NextResponse } from "next/server";
import { getConferenceById, getRegistrations } from "@/db/queries";
import { getCurrentUser } from "@/lib/auth";

function csvCell(value: string | number): string {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !["admin", "organizer"].includes(user.role)) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await context.params;
  const conference = await getConferenceById(Number(id));
  if (!conference) return new NextResponse("Not found", { status: 404 });
  const rows = await getRegistrations(conference.id);
  const header = ["code", "full_name", "email", "phone", "organization", "job_title", "ticket_type", "status", "notes", "created_at"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push([r.code, r.fullName, r.email, r.phone, r.organization, r.jobTitle, r.ticketType, r.status, r.notes, r.createdAt].map(csvCell).join(","));
  }
  const body = "﻿" + lines.join("\r\n"); // BOM so Excel opens Arabic text correctly
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="registrations-${conference.slug}.csv"`,
    },
  });
}
