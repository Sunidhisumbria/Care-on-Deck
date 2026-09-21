const DOTS = ['#a51e69', '#14b8a6', '#f97316', '#3b82f6'];

/**
 * The tick inside a ring of dots that opens the success dialogs: a confirmed
 * booking (brand) and saved insurance (green). Decoration only.
 */
export function SuccessBurst({ tone = 'brand' }: { tone?: 'brand' | 'success' }) {
  return (
    <svg viewBox="0 0 96 96" className="mx-auto h-20 w-20" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return (
          <circle
            key={i}
            cx={48 + Math.cos(angle) * 38}
            cy={48 + Math.sin(angle) * 38}
            r={i % 2 === 0 ? 4 : 3}
            fill={DOTS[i % DOTS.length]}
          />
        );
      })}
      <circle cx="48" cy="48" r="22" fill={tone === 'success' ? '#22c55e' : '#a51e69'} />
      <path
        d="m38 48 7 7 14-14"
        fill="none"
        stroke="#fff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
