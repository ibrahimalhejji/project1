import type { Sponsor } from "@/db/schema";
import { SPONSOR_TIERS } from "@/db/schema";
import type { Dict } from "@/i18n/dictionaries";

export function SponsorGrid({ sponsors, dict }: { sponsors: Sponsor[]; dict: Dict }) {
  if (sponsors.length === 0) return <p className="text-slate-600">{dict.conference.noSponsors}</p>;
  return (
    <div className="space-y-6">
      {SPONSOR_TIERS.map((tier) => {
        const group = sponsors.filter((s) => s.tier === tier);
        if (!group.length) return null;
        return (
          <div key={tier}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{dict.conference.tiers[tier]}</h3>
            <div className="flex flex-wrap gap-3">
              {group.map((sponsor) => {
                const content = sponsor.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sponsor.logoUrl} alt={sponsor.name} className="max-h-12 max-w-[160px] object-contain" />
                ) : (
                  <span className="text-sm font-semibold text-slate-700">{sponsor.name}</span>
                );
                const classes = "card flex h-20 min-w-[160px] items-center justify-center px-5 transition hover:shadow-md";
                return sponsor.website ? (
                  <a key={sponsor.id} href={sponsor.website} target="_blank" rel="noreferrer" className={classes} title={sponsor.name}>
                    {content}
                  </a>
                ) : (
                  <div key={sponsor.id} className={classes} title={sponsor.name}>
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
