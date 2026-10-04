export function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="12" fill="#1f6661" />
      <circle cx="17" cy="19" r="5" fill="#f2b33d" />
      <circle cx="31" cy="19" r="5" fill="#a9d7d1" />
      <path d="M9 36c1.5-6 5-9 8-9s6.5 3 8 9" fill="none" stroke="#f2b33d" strokeWidth="3" strokeLinecap="round" />
      <path d="M23 36c1.5-6 5-9 8-9s6.5 3 8 9" fill="none" stroke="#a9d7d1" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
