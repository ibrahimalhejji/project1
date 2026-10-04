import type { Track } from "@/db/schema";
import type { SessionWithSpeakers } from "@/db/queries";
import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries";
import { formatDate, localized } from "@/lib/utils";

export function Agenda({ sessions, tracks, locale, dict }: { sessions: SessionWithSpeakers[]; tracks: Track[]; locale: Locale; dict: Dict }) {
  if (sessions.length === 0) return <p className="text-slate-600">{dict.conference.noSessions}</p>;
  const days = Array.from(new Set(sessions.map((s) => s.day))).sort();
  const trackById = new Map(tracks.map((t) => [t.id, t]));
  return (
    <div className="space-y-8">
      {days.map((day, index) => (
        <section key={day}>
          <h3 className="mb-3 flex items-baseline gap-3 text-lg font-bold text-slate-900">
            <span className="rounded-lg bg-brand-600 px-2.5 py-0.5 text-sm text-white">{dict.common.day} {index + 1}</span>
            <span>{formatDate(day, locale, { weekday: "long" })}</span>
          </h3>
          <ol className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {sessions
              .filter((s) => s.day === day)
              .map((session) => {
                const track = session.trackId ? trackById.get(session.trackId) : undefined;
                const isBreak = session.type === "break";
                return (
                  <li key={session.id} className={`flex flex-col gap-2 p-4 sm:flex-row sm:gap-6 ${isBreak ? "bg-slate-50" : ""}`}>
                    <div className="w-32 shrink-0 text-sm font-semibold text-brand-700" dir="ltr">
                      {session.startTime} – {session.endTime}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className={`font-semibold ${isBreak ? "text-slate-600" : "text-slate-900"}`}>{localized(session, "title", locale)}</h4>
                        <span className="badge bg-slate-100 text-slate-600">{dict.conference.sessionTypes[session.type]}</span>
                        {track ? (
                          <span className="badge text-white" style={{ backgroundColor: track.color }}>
                            {localized(track, "name", locale)}
                          </span>
                        ) : null}
                        {session.room ? <span className="text-xs text-slate-500">{dict.common.room}: {session.room}</span> : null}
                      </div>
                      {localized(session, "abstract", locale) ? <p className="mt-1 text-sm leading-6 text-slate-600">{localized(session, "abstract", locale)}</p> : null}
                      {session.speakers.length ? (
                        <p className="mt-2 text-sm text-slate-700">
                          <span className="font-medium">{dict.conference.speakers}: </span>
                          {session.speakers.map((sp) => localized(sp, "name", locale)).join("، ")}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
          </ol>
        </section>
      ))}
    </div>
  );
}
