// The Maatu mark: a speech bubble whose dots grow, the last one warm.
// A few words today, more courage tomorrow. Server-safe, no hooks.
export function BrandMark({ size = 35, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M20 4H44a16 16 0 0 1 16 16v14a16 16 0 0 1-16 16H27L13.6 59.3c-1.5 1-3.4-.2-3.1-2L11.6 48A16 16 0 0 1 4 34V20A16 16 0 0 1 20 4Z"
        fill="var(--purple, #6350c6)"
      />
      <circle cx="18.6" cy="31.4" r="3.6" fill="#fff" />
      <circle cx="30.6" cy="29.6" r="5.3" fill="#fff" />
      <circle cx="45.4" cy="27.4" r="7.4" fill="var(--voice, #ee9459)" />
    </svg>
  );
}

/** "maatu" with the round voice dot as its full stop. */
export function Wordmark() {
  return (
    <span className="wordmark">
      maatu
      <span className="brand-dot" aria-hidden="true" />
    </span>
  );
}
