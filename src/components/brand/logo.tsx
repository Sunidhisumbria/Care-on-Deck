/** Shared vector wordmark: black lettering with the magenta orbit arrow. */
export function Logo({ className = '', tone = 'brand' }: { className?: string; tone?: 'brand' | 'light' }) {
  return (
    <span className={`brand-logo ${className}`}>
      <svg viewBox="0 0 370 105" role="img" aria-label="CareOndeck" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M20 41C5 47-3 72 4 88C17 116 89 104 163 78L169 89L180 65L153 61L159 70C103 89 42 103 20 89C7 81 9 56 20 41Z"
          fill="#9e2872"
        />
        <text x="14" y="65" fill={tone === 'light' ? '#ffffff' : '#202020'}
          fontFamily="Arial, Helvetica, sans-serif" fontSize="70" fontWeight="700"
          letterSpacing="-4.5" textLength="350" lengthAdjust="spacingAndGlyphs">CareOndeck</text>
      </svg>
    </span>
  );
}
