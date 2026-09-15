/**
 * Holds the map's place on provider search until the Google Maps key exists.
 *
 * A drawing, not an icon: it belongs to this one screen, which is why it lives
 * here rather than in the shared icon set.
 */
export function MapPlaceholder() {
  return (
    <svg viewBox="0 0 240 200" className="h-full w-full" aria-hidden="true" fill="none">
      <rect width="240" height="200" fill="#eef1e9" />
      <path
        d="M0 44h240M0 96h240M0 148h240M52 0v200M128 0v200M196 0v200"
        stroke="#dfe4d6"
        strokeWidth="7"
      />
      <path d="M0 120 240 66" stroke="#f2e3b8" strokeWidth="9" />
      {[
        [64, 70],
        [132, 104],
        [188, 60],
        [96, 150],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
          <path d="M0 18c0 0 9-9.4 9-14.6A9 9 0 1 0-9 3.4C-9 8.6 0 18 0 18Z" fill="#a51e69" />
          <circle cy="3.2" r="3.2" fill="#fff" />
        </g>
      ))}
    </svg>
  );
}
