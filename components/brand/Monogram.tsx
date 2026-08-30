/**
 * Ride Catalyst monogram — a car in side profile reduced to a roofline, a
 * body and two wheels, set in a rounded badge. Drawn rather than lettered so
 * it reads at 20px in a header and still holds up large on the hero.
 */
export function Monogram({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="0.75"
        y="0.75"
        width="30.5"
        height="30.5"
        rx="8.5"
        stroke="currentColor"
        strokeOpacity="0.22"
        strokeWidth="1.5"
      />
      {/* roofline + bonnet */}
      <path
        d="M7 18.2c0-.6.3-1.1.8-1.4l1.9-1 2.4-3.4c.4-.5 1-.8 1.6-.8h4.9c.7 0 1.3.3 1.7.9l2.2 3.3 1.9 1c.5.3.8.8.8 1.4v1.6c0 .5-.4.9-.9.9h-1.1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.4 20.7H7.9c-.5 0-.9-.4-.9-.9v-1.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M19.6 20.7h-6.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      {/* windows */}
      <path
        d="M12.9 16.4l1.6-2.3h3.6l1.5 2.3h-6.7z"
        fill="currentColor"
        fillOpacity="0.18"
      />
      {/* wheels — the accent lives here */}
      <circle cx="12.4" cy="20.8" r="2.3" stroke="var(--accent)" strokeWidth="1.7" />
      <circle cx="20.6" cy="20.8" r="2.3" stroke="var(--accent)" strokeWidth="1.7" />
    </svg>
  );
}

export function Wordmark({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <Monogram size={size} className="text-heading" />
      <span className="leading-none">
        <span
          className="block text-[15px] font-semibold tracking-tight text-heading"
          style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
        >
          Ride Catalyst
        </span>
        <span className="eyebrow block text-[9px]">Workshop Intelligence</span>
      </span>
    </span>
  );
}
